from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class ZlowionaRybaCreateRequest(BaseModel):
    gatunek_id: int
    waga_g: Optional[int] = Field(None, gt=0)
    dlugosc_cm: Optional[float] = Field(None, gt=0)
    metoda_id: Optional[int] = None
    przyneta_id: Optional[int] = None
    wypuszczona: bool = False
    zdjecie_url: Optional[str] = None
    uwagi: Optional[str] = None

class ZlowionaRybaUpdateRequest(BaseModel):
    gatunek_id: Optional[int] = None
    waga_g: Optional[int] = Field(None, gt=0)
    dlugosc_cm: Optional[float] = Field(None, gt=0)
    metoda_id: Optional[int] = None
    przyneta_id: Optional[int] = None
    wypuszczona: Optional[bool] = None
    zdjecie_url: Optional[str] = None
    uwagi: Optional[str] = None

class ZlowionaRybaResponse(BaseModel):
    id: int
    sesja_id: int
    gatunek_id: int
    waga_g: Optional[int]
    dlugosc_cm: Optional[float]
    metoda_id: Optional[int]
    przyneta_id: Optional[int]
    wypuszczona: bool
    zdjecie_url: Optional[str]
    uwagi: Optional[str]
    czas_zlowienia: datetime
    
    # Rozszerzone pola (dołączane przy JOIN)
    nazwa_gatunku: Optional[str] = None
    nazwa_metody: Optional[str] = None
    nazwa_przynety: Optional[str] = None
    
    class Config:
        from_attributes = True