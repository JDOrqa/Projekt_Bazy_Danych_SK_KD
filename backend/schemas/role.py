# Plik: schemas/role.py
# Schematy dla ról i uprawnień.
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RoleBase(BaseModel):
    nazwa: str
    opis: Optional[str] = None

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    nazwa: Optional[str] = None
    opis: Optional[str] = None

class RoleResponse(RoleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UprawnienieBase(BaseModel):
    kod: str
    nazwa: str
    modul: Optional[str] = None
    opis: Optional[str] = None

class UprawnienieCreate(UprawnienieBase):
    pass

class UprawnienieResponse(UprawnienieBase):
    id: int

    class Config:
        from_attributes = True