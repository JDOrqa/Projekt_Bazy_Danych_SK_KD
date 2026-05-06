from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


class StacjaPomiarowaResponse(BaseModel):
    id: int
    lowisko_id: int
    nazwa: str
    typ_czujnikow: Optional[List[str]] = None
    last_seen: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StacjaPomiarowaCreate(BaseModel):
    lowisko_id: int
    nazwa: str
    typ_czujnikow: List[str]


class OdczytSrodowiskowyResponse(BaseModel):
    id: int
    stacja_id: int
    czas_odczytu: datetime
    temperatura_wody_c: Optional[float] = None
    poziom_tlenu_mgl: Optional[float] = None
    ph: Optional[float] = None
    metnosc_ntu: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

