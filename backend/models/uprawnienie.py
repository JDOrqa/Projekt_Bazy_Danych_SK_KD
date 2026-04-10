# Plik: models/uprawnienie.py
# Tabela UPRAWNIENIA i ROLA_UPRAWNIENIE.
# Definiuje szczegółowe akcje (np. "lake.create", "fish.edit").

from sqlalchemy import Column, BigInteger, String, ForeignKey
from database import Base

class Uprawnienie(Base):
    __tablename__ = "UPRAWNIENIA"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    kod = Column(String(100), unique=True, nullable=False)   # np. "lake.create"
    nazwa = Column(String(200))                              # "Tworzenie łowiska"
    modul = Column(String(100))                              # "łowiska"
    opis = Column(String(500))

class RolaUprawnienie(Base):
    __tablename__ = "ROLA_UPRAWNIENIE"
    
    rola_id = Column(BigInteger, ForeignKey("ROLE.id"), primary_key=True)
    uprawnienie_id = Column(BigInteger, ForeignKey("UPRAWNIENIA.id"), primary_key=True)