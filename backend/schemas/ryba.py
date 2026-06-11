from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class ZlowionaRybaCreateRequest(BaseModel):
    gatunek_id: int
    waga_g: Optional[int] = Field(None, gt=0)
    dlugosc_cm: Optional[float] = Field(None, gt=0)
    metoda_id: Optional[int] = None
    przyneta_id: Optional[int] = None
    wypuszczona: bool = False
    powod_wypuszczenia: Optional[str] = None
    zdjecie_url: Optional[str] = None
    uwagi: Optional[str] = None


class ZlowionaRybaUpdateRequest(BaseModel):
    gatunek_id: Optional[int] = None
    waga_g: Optional[int] = Field(None, gt=0)
    dlugosc_cm: Optional[float] = Field(None, gt=0)
    metoda_id: Optional[int] = None
    przyneta_id: Optional[int] = None
    wypuszczona: Optional[bool] = None
    powod_wypuszczenia: Optional[str] = None
    zdjecie_url: Optional[str] = None
    uwagi: Optional[str] = None


class ZlowionaRybaResponse(BaseModel):
    id: int
    sesja_id: int
    gatunek_id: int
    waga_g: Optional[int] = None
    dlugosc_cm: Optional[float] = None
    metoda_id: Optional[int] = None
    przyneta_id: Optional[int] = None
    wypuszczona: bool
    powod_wypuszczenia: Optional[str] = None
    narusza_limit: bool = False
    powod_naruszenia: Optional[str] = None
    ostrzezenie_wyswietlone: bool = False
    zdjecie_url: Optional[str] = None
    uwagi: Optional[str] = None
    czas_zlowienia: datetime
    nazwa_gatunku: Optional[str] = None
    nazwa_metody: Optional[str] = None
    nazwa_przynety: Optional[str] = None
    zdjecia: List[str] = []  

    class Config:
        from_attributes = True


class ZlowionaRybaValidationWarning(BaseModel):
    """Ostrzeżenie walidacji dla złowionej ryby"""
    typ_ostrzezenia: str   # "wymiar_minimalny", "wymiar_maksymalny", "gatunek_chroniony", "inwazyna", "limit_dzienny", "no_kill"
    wiadomosc: str
    wymusi_wypuszczenie: bool  # Czy ryba MUSI być wypuszczona
