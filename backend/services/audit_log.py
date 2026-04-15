# Plik: services/audit_log.py
# Funkcja do rejestrowania akcji w tabeli LOGI_AUDYTU.
# Używana przez routery przy operacjach INSERT, UPDATE, DELETE.

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func
from models.log_audytu import LogAudytu
import json
from typing import Optional

async def log_audit(
    db: AsyncSession,
    user_id: int,
    tabela: str,
    rekord_id: int,
    akcja: str,  # INSERT, UPDATE, DELETE
    stare_dane: Optional[dict] = None,
    nowe_dane: Optional[dict] = None
) -> None:
    """
    Dodaje wpis do logu audytu.
    Wywoływane przez routery po każdej krytycznej zmianie.
    """
    log = LogAudytu(
        uzytkownik_id=user_id,
        tabela=tabela,
        rekord_id=rekord_id,
        akcja=akcja,
        stare_dane=json.dumps(stare_dane, ensure_ascii=False) if stare_dane else None,
        nowe_dane=json.dumps(nowe_dane, ensure_ascii=False) if nowe_dane else None,
        data_czas=func.now()
    )
    db.add(log)
    await db.commit()