# Plik: schemas/limit.py
# Schematy dla limitów połowowych (LimitPolowowy).
# Używane przez: routers/limits.py

from pydantic import BaseModel, Field, validator
from typing import Optional, Tuple, List
from datetime import date, datetime


class LimitPolowowyBase(BaseModel):
    lowisko_id: int
    gatunek_id: int
    wymiar_min_cm: Optional[float] = Field(None, gt=0)
    wymiar_max_cm: Optional[float] = Field(None, gt=0)
    limit_dzienny: Optional[int] = Field(None, ge=0)
    limit_tygodniowy: Optional[int] = Field(None, ge=0)
    limit_roczny: Optional[int] = Field(None, ge=0)
    sezon_ochronny: Optional[Tuple[date, date]] = None  # (data_start, data_end)

    @validator('sezon_ochronny')
    def validate_date_range(cls, v):
        if v and v[0] > v[1]:
            raise ValueError('Data początkowa nie może być późniejsza niż końcowa')
        return v


class LimitPolowowyCreate(LimitPolowowyBase):
    pass


class LimitPolowowyUpdate(BaseModel):
    wymiar_min_cm: Optional[float] = Field(None, gt=0)
    wymiar_max_cm: Optional[float] = Field(None, gt=0)
    limit_dzienny: Optional[int] = Field(None, ge=0)
    limit_tygodniowy: Optional[int] = Field(None, ge=0)
    limit_roczny: Optional[int] = Field(None, ge=0)
    sezon_ochronny: Optional[Tuple[date, date]] = None

    @validator('sezon_ochronny')
    def validate_date_range(cls, v):
        if v and v[0] > v[1]:
            raise ValueError('Data początkowa nie może być późniejsza niż końcowa')
        return v


class LimitPolowowyResponse(BaseModel):
    id: int
    lowisko_id: int
    gatunek_id: int
    wymiar_min_cm: Optional[float] = None
    wymiar_max_cm: Optional[float] = None
    limit_dzienny: Optional[int] = None
    limit_tygodniowy: Optional[int] = None
    limit_roczny: Optional[int] = None
    sezon_ochronny: Optional[List[str]] = None  # ["YYYY-MM-DD", "YYYY-MM-DD"]
    created_at: datetime
    updated_at: datetime
    # Pola rozszerzone (JOIN)
    nazwa_gatunku: Optional[str] = None
    nazwa_lowiska: Optional[str] = None

    class Config:
        from_attributes = True
