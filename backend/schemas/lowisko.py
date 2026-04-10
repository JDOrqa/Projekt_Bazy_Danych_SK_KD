# Plik: schemas/lowisko.py
# Schematy dla łowisk (CRUD). Używane przez: routers/lakes.py

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Tuple
from datetime import datetime

class LowiskoBase(BaseModel):
    nazwa: str = Field(..., min_length=1, max_length=200)
    typ: Optional[str] = Field(None, max_length=50)
    granice: List[Tuple[float, float]]  # lista par (lon, lat) – wielokąt
    powierzchnia_ha: float = Field(..., gt=0)
    glebokosc_max: Optional[float] = Field(None, gt=0)
    opis: Optional[str] = None

    @validator('granice')
    def validate_polygon(cls, v):
        if len(v) < 3:
            raise ValueError('Wielokąt musi mieć co najmniej 3 punkty')
        # Sprawdź czy pierwszy i ostatni punkt są takie same (zamknięty)
        if v[0] != v[-1]:
            v.append(v[0])
        return v

class LowiskoCreate(LowiskoBase):
    pass

class LowiskoUpdate(BaseModel):
    nazwa: Optional[str] = None
    typ: Optional[str] = None
    granice: Optional[List[Tuple[float, float]]] = None
    powierzchnia_ha: Optional[float] = None
    glebokosc_max: Optional[float] = None
    opis: Optional[str] = None

class LowiskoResponse(LowiskoBase):
    id: int
    wlasciciel_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True