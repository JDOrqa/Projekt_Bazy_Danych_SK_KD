# Plik: schemas/auth.py
# Definiuje modele danych dla autoryzacji (rejestracja, logowanie, tokeny).
# Używane przez: routers/auth.py

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    imie: str = Field(..., min_length=1, max_length=100)
    nazwisko: str = Field(..., min_length=1, max_length=100)
    nr_licencji: Optional[str] = Field(None, max_length=50)

    @validator('password')
    def password_strength(cls, v):
        # Minimalne wymagania: przynajmniej jedna cyfra i jedna litera
        if not any(c.isdigit() for c in v):
            raise ValueError('Hasło musi zawierać przynajmniej jedną cyfrę')
        if not any(c.isalpha() for c in v):
            raise ValueError('Hasło musi zawierać przynajmniej jedną literę')
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class EmailVerifyRequest(BaseModel):
    user_id: int
    token: str