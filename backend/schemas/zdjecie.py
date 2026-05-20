# Plik: schemas/zdjecie.py
# Schematy dla zdjęć ryb i wyników przetwarzania.
# Używane przez: routers/images.py

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

# Wspólne pola dla submit i response
class PhotoBase(BaseModel):
    species_id: Optional[int] = None
    length_cm: Optional[float] = None

class PhotoSubmitRequest(PhotoBase):
    pass  # tylko te dwa pola

class VerificationActionRequest(BaseModel):
    action: str  # "approve" lub "reject"

class PhotoVerificationResponse(PhotoBase):
    id: int
    user_id: int
    photo_url: str
    status: int
    moderator_id: Optional[int] = None
    created_at: datetime
    verified_at: Optional[datetime] = None
    user_name: Optional[str] = None
    species_name: Optional[str] = None

    class Config:
        from_attributes = True