# Plik: services/limits_validator.py
# Serwis do walidacji limitów połowowych zgodnie z RAPR

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func as sql_func
from datetime import datetime, date
from typing import Optional, List, Tuple

from models.limit_polowowy import LimitPolowowy
from models.gatunek import Gatunek
from models.zlowiona_ryba import ZlowionaRyba
from models.sesja_polowu import SesjaPolowu
from models.lowisko import Lowisko
from schemas.ryba import ZlowionaRybaValidationWarning


class LimitValidator:
    """Klasa do walidacji limitów połowowych i wymogów RAPR"""

    @staticmethod
    async def validate_catch(
        db: AsyncSession,
        uzytkownik_id: int,
        sesja_id: int,
        gatunek_id: int,
        dlugosc_cm: Optional[float],
        lowisko_id: int,
    ) -> Tuple[List[ZlowionaRybaValidationWarning], bool]:
        """
        Waliduje złowioną rybę względem limitów.
        Zwraca: (lista ostrzeżeń, czy musi być wypuszczona)
        """
        warnings: List[ZlowionaRybaValidationWarning] = []
        wymusi_wypuszczenie = False

        # 1. Pobierz gatunek
        gatunek = await db.get(Gatunek, gatunek_id)
        if not gatunek:
            return warnings, wymusi_wypuszczenie

        # 2. Pobierz łowisko
        lowisko = await db.get(Lowisko, lowisko_id)
        if not lowisko:
            return warnings, wymusi_wypuszczenie

        # 3. Pobierz limit na to łowisku
        limit_result = await db.execute(
            select(LimitPolowowy).where(
                and_(
                    LimitPolowowy.lowisko_id == lowisko_id,
                    LimitPolowowy.gatunek_id == gatunek_id
                )
            )
        )
        limit_polowowy = limit_result.scalar_one_or_none()

        dzisiaj = date.today()

        # ========== WALIDACJA WYMIARÓW ==========

        wymiar_min = (
            limit_polowowy.wymiar_min_cm
            if limit_polowowy and limit_polowowy.wymiar_min_cm
            else gatunek.wymiar_min_cm
        )
        if dlugosc_cm and wymiar_min and dlugosc_cm < float(wymiar_min):
            warnings.append(ZlowionaRybaValidationWarning(
                typ_ostrzezenia="wymiar_minimalny",
                wiadomosc=f"Ryba jest za mała! Wymiar minimalny: {wymiar_min} cm, złowiona: {dlugosc_cm} cm. Musisz ją wypuścić!",
                wymusi_wypuszczenie=True
            ))
            wymusi_wypuszczenie = True

        wymiar_max = (
            limit_polowowy.wymiar_max_cm
            if limit_polowowy and limit_polowowy.wymiar_max_cm
            else gatunek.wymiar_max_cm
        )
        if dlugosc_cm and wymiar_max and dlugosc_cm > float(wymiar_max):
            warnings.append(ZlowionaRybaValidationWarning(
                typ_ostrzezenia="wymiar_maksymalny",
                wiadomosc=f"Ryba jest za duża! Wymiar maksymalny: {wymiar_max} cm, złowiona: {dlugosc_cm} cm. Musisz ją wypuścić!",
                wymusi_wypuszczenie=True
            ))
            wymusi_wypuszczenie = True

        # ========== WALIDACJA STATUSU OCHRONY ==========

        if gatunek.gatunek_chroniony:
            warnings.append(ZlowionaRybaValidationWarning(
                typ_ostrzezenia="gatunek_chroniony",
                wiadomosc=f"Gatunek '{gatunek.nazwa_polska}' jest chroniony! Musisz go natychmiast wypuścić!",
                wymusi_wypuszczenie=True
            ))
            wymusi_wypuszczenie = True

        if gatunek.inwazyjny:
            warnings.append(ZlowionaRybaValidationWarning(
                typ_ostrzezenia="inwazyna",
                wiadomosc=f"Gatunek '{gatunek.nazwa_polska}' jest inwazyjny! Nie można go wypuszczać.",
                wymusi_wypuszczenie=False
            ))

        # ========== WALIDACJA OKRESU OCHRONNEGO ==========

        if limit_polowowy and limit_polowowy.sezon_ochronny:
            try:
                data_start = limit_polowowy.sezon_ochronny.lower
                data_koniec = limit_polowowy.sezon_ochronny.upper
                if data_start and data_koniec and data_start <= dzisiaj < data_koniec:
                    warnings.append(ZlowionaRybaValidationWarning(
                        typ_ostrzezenia="sezon_ochronny",
                        wiadomosc=f"Gatunek '{gatunek.nazwa_polska}' jest w okresie ochronnym ({data_start} – {data_koniec})! Musisz go wypuścić!",
                        wymusi_wypuszczenie=True
                    ))
                    wymusi_wypuszczenie = True
            except Exception:
                pass

        # ========== WALIDACJA TAGU "NO KILL" ==========

        if lowisko.no_kill:
            warnings.append(ZlowionaRybaValidationWarning(
                typ_ostrzezenia="no_kill",
                wiadomosc=f"Łowisko '{lowisko.nazwa}' ma tag 'No Kill' – wszystkie ryby muszą być wypuszczone!",
                wymusi_wypuszczenie=True
            ))
            wymusi_wypuszczenie = True

        # ========== WALIDACJA LIMITÓW DZIENNYCH ==========

        if limit_polowowy and limit_polowowy.limit_dzienny is not None:
            ryby_dzisiaj_result = await db.execute(
                select(sql_func.count(ZlowionaRyba.id)).where(
                    and_(
                        ZlowionaRyba.sesja_id.in_(
                            select(SesjaPolowu.id).where(
                                and_(
                                    SesjaPolowu.uzytkownik_id == uzytkownik_id,
                                    SesjaPolowu.lowisko_id == lowisko_id,
                                    sql_func.date(SesjaPolowu.data_rozpoczecia) == dzisiaj
                                )
                            )
                        ),
                        ZlowionaRyba.gatunek_id == gatunek_id,
                        ZlowionaRyba.wypuszczona == False
                    )
                )
            )
            liczba_zlowionych_dzisiaj = ryby_dzisiaj_result.scalar() or 0

            if liczba_zlowionych_dzisiaj >= limit_polowowy.limit_dzienny:
                warnings.append(ZlowionaRybaValidationWarning(
                    typ_ostrzezenia="limit_dzienny",
                    wiadomosc=f"Dzienny limit dla '{gatunek.nazwa_polska}' ({limit_polowowy.limit_dzienny} szt.) osiągnięty! Musisz wypuścić tę rybę!",
                    wymusi_wypuszczenie=True
                ))
                wymusi_wypuszczenie = True

        return warnings, wymusi_wypuszczenie

    @staticmethod
    async def update_history(
        db: AsyncSession,
        uzytkownik_id: int,
        gatunek_id: int,
        lowisko_id: int,
        wypuszczona: bool,
        dlugosc_cm: Optional[float] = None,
    ):
        """Aktualizuje historię limitów użytkownika w tabeli HISTORIA_LIMITOW_UZYTKOWNIKA."""
        from sqlalchemy import text
        dzisiaj = date.today()

        try:
            # Sprawdź czy rekord istnieje
            result = await db.execute(
                text("""
                    SELECT id, liczba_zlowionych, liczba_zatrzymanych, liczba_wypuszczonych
                    FROM "HISTORIA_LIMITOW_UZYTKOWNIKA"
                    WHERE uzytkownik_id = :uid
                      AND gatunek_id = :gid
                      AND lowisko_id = :lid
                      AND data = :data
                """),
                {"uid": uzytkownik_id, "gid": gatunek_id, "lid": lowisko_id, "data": dzisiaj}
            )
            row = result.fetchone()

            if row:
                # Aktualizuj istniejący rekord
                await db.execute(
                    text("""
                        UPDATE "HISTORIA_LIMITOW_UZYTKOWNIKA"
                        SET liczba_zlowionych = COALESCE(liczba_zlowionych, 0) + 1,
                            liczba_zatrzymanych = COALESCE(liczba_zatrzymanych, 0) + :zatrzymana,
                            liczba_wypuszczonych = COALESCE(liczba_wypuszczonych, 0) + :wypuszczona,
                            updated_at = NOW()
                        WHERE id = :id
                    """),
                    {
                        "id": row[0],
                        "zatrzymana": 0 if wypuszczona else 1,
                        "wypuszczona": 1 if wypuszczona else 0,
                    }
                )
            else:
                # Wstaw nowy rekord
                await db.execute(
                    text("""
                        INSERT INTO "HISTORIA_LIMITOW_UZYTKOWNIKA"
                            (uzytkownik_id, gatunek_id, lowisko_id, data,
                             liczba_zlowionych, liczba_zatrzymanych, liczba_wypuszczonych)
                        VALUES (:uid, :gid, :lid, :data, 1, :zatrzymana, :wypuszczona)
                    """),
                    {
                        "uid": uzytkownik_id,
                        "gid": gatunek_id,
                        "lid": lowisko_id,
                        "data": dzisiaj,
                        "zatrzymana": 0 if wypuszczona else 1,
                        "wypuszczona": 1 if wypuszczona else 0,
                    }
                )
            await db.commit()
        except Exception as e:
            # Historia limitów nie jest krytyczna – logujemy błąd ale nie przerywamy
            import logging
            logging.getLogger(__name__).warning(f"Błąd aktualizacji historii limitów: {e}")
            await db.rollback()
