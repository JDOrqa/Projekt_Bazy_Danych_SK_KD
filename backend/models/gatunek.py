# Plik: models/gatunek.py
# Katalog gatunków ryb. Używane w połowach, limitach, parametrach populacji.
# Miękkie usuwanie.

from sqlalchemy import Column, BigInteger, String, TIMESTAMP, Text
from sqlalchemy.sql import func
from database import Base

class Gatunek(Base):
    __tablename__ = "GATUNKI"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    nazwa_polska = Column(String(200), unique=True, nullable=False)
    nazwa_lacina = Column(String(200), unique=True, nullable=False)
    url_zdjecia = Column(Text)
    opis = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(TIMESTAMP, nullable=True) 
   
   #Modele  to klasy SQLAlchemy, które odwzorowują tabele w bazie danych.
   #Schematy to klasy Pydantic, które definiują kształt danych przychodzących w żądaniu (request) lub wychodzących w odpowiedzi (response) API.