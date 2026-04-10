# Plik: models/rola.py
# Tabela ROLE i tabela łącząca UZYTKOWNIK_ROLE.
# Używane przez RBAC (sprawdzanie uprawnień).

from sqlalchemy import Column, BigInteger, String, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Rola(Base):
    __tablename__ = "ROLE"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    nazwa = Column(String(100), unique=True, nullable=False)  # Wędkarz, Właściciel, Moderator, Admin
    opis = Column(String(500))
    created_at = Column(TIMESTAMP, server_default=func.now())

class UzytkownikRola(Base):
    __tablename__ = "UZYTKOWNIK_ROLE"
    
    uzytkownik_id = Column(BigInteger, ForeignKey("UZYTKOWNICY.id"), primary_key=True)
    rola_id = Column(BigInteger, ForeignKey("ROLE.id"), primary_key=True)