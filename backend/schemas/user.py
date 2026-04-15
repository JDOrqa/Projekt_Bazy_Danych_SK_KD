# Plik: schemas/user.py
# Schematy dla użytkowników – profil, aktualizacja, zmiana hasła.
# Używane przez: routers/users.py, routers/admin.py

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List

class UserBase(BaseModel):
    email: EmailStr
    imie: str
    nazwisko: str
    nr_licencji: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=4)

class UserProfile(UserBase):
    id: int
    status: str
    roles: List[str] = []

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    imie: Optional[str] = None
    nazwisko: Optional[str] = None
    nr_licencji: Optional[str] = None

class ChangePassword(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=4)
    confirm_password: str

    @validator('new_password')
    def validate_new(cls, v):
        if not any(c.isdigit() for c in v):
            raise ValueError('Nowe hasło musi zawierać cyfrę')
        return v

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Hasła nie są identyczne')
        return v

class UserAdminUpdate(BaseModel):
    status: Optional[str] = None  # aktywny, zablokowany, nieaktywny

class UserResponse(UserProfile):
    pass
