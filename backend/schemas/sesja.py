from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from .ryba import ZlowionaRybaResponse

# --- Request schemas ---
class SesjaStartRequest(BaseModel):
    lowisko_id: int
    start_gps_lat: Optional[float] = Field(None, ge=-90, le=90)
    start_gps_lon: Optional[float] = Field(None, ge=-180, le=180)
    uwagi: Optional[str] = None

class SesjaEndRequest(BaseModel):
    koniec_gps_lat: Optional[float] = Field(None, ge=-90, le=90)
    koniec_gps_lon: Optional[float] = Field(None, ge=-180, le=180)

class SesjaUpdateRequest(BaseModel):
    lowisko_id: Optional[int] = None
    uwagi: Optional[str] = None

# --- Response schemas ---
class SesjaResponse(BaseModel):
    id: int
    uzytkownik_id: int
    lowisko_id: int
    data_rozpoczecia: datetime
    data_zakonczenia: Optional[datetime]
    start_gps_lat: Optional[float]
    start_gps_lon: Optional[float]
    koniec_gps_lat: Optional[float]
    koniec_gps_lon: Optional[float]
    uwagi: Optional[str]
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class SesjaDetailResponse(SesjaResponse):
    """Sesja z listą złowionych ryb"""
    zlowione_ryby: List[ZlowionaRybaResponse] = []
    nazwa_lowiska: Optional[str] = None
    nazwa_uzytkownika: Optional[str] = None