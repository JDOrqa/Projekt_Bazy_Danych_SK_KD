# Plik: schemas/zarybienie.py
# Schematy dla zarybień. Używane przez: routers/zarybienia.py

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class ZarybienieBaza(BaseModel):
    lowisko_id: int
    gatunek_id: int
    data_zarybienia: date
    ilosc: Optional[int] = Field(None, gt=0)
    koszt: Optional[float] = Field(None, ge=0)
    uwagi: Optional[str] = None


class ZarybienieTworz(ZarybienieBaza):
    pass


class ZarybieniAktualizuj(BaseModel):
    data_zarybienia: Optional[date] = None
    ilosc: Optional[int] = Field(None, gt=0)
    koszt: Optional[float] = Field(None, ge=0)
    uwagi: Optional[str] = None


class ZarybieniOdpowiedz(BaseModel):
    id: int
    lowisko_id: int
    gatunek_id: int
    data_zarybienia: date
    ilosc: Optional[int] = None
    koszt: Optional[float] = None
    uwagi: Optional[str] = None
    created_at: datetime
    nazwa_gatunku: Optional[str] = None
    nazwa_lowiska: Optional[str] = None

    class Config:
        from_attributes = True
