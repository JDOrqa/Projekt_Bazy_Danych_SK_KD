# Plik: schemas/zarybienie.py
# Schematy dla zarybień. Używane przez: routers/zarybienia.py

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class ZarybienieBaza(BaseModel):
    lowisko_id: int
    gatunek_id: int
    data_zarybienia: date
    ilosc: Optional[int] = Field(None, gt=0)
    koszt: Optional[Decimal] = Field(None, ge=0)
    uwagi: Optional[str] = None


class ZarybienieTworz(ZarybienieBaza):
    pass


class ZarybieniAktualizuj(BaseModel):
    data_zarybienia: Optional[date] = None
    ilosc: Optional[int] = Field(None, gt=0)
    koszt: Optional[Decimal] = Field(None, ge=0)
    uwagi: Optional[str] = None


class ZarybieniOdpowiedz(ZarybienieBaza):
    id: int
    created_at: datetime
    # Pola rozszerzone (JOIN)
    nazwa_gatunku: Optional[str] = None
    nazwa_lowiska: Optional[str] = None

    class Config:
        from_attributes = True
