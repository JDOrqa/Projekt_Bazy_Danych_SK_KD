# Plik: models/uzytkownik.py
# Tabela UZYTKOWNICY – przechowuje dane logowania, profilowe oraz miękko usuwane.
# Używana przez: auth, profile, sesje połowów, właścicieli łowisk, logi.

from sqlalchemy import Column, BigInteger, String, TIMESTAMP, text
from sqlalchemy.sql import func
from database import Base

class Uzytkownik(Base):
    __tablename__ = "UZYTKOWNICY"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    haslo_hash = Column(String(255), nullable=False)  # bcrypt
    imie = Column(String(100))
    nazwisko = Column(String(100))
    nr_licencji = Column(String(50))
    status = Column(String(20), nullable=False, default="nieaktywny")  # aktywny, zablokowany, nieaktywny
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(TIMESTAMP, nullable=True)  # miękkie usuwanie – gdy nie null, konto usunięte