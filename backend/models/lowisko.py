# Plik: models/lowisko.py
# Tabela LOWISKA – geometria wielokąta (PostGIS), właściciel (użytkownik).
# Powiązane z sesjami, stacjami pomiarowymi, limitami, zarybieniami.

from sqlalchemy import Column, BigInteger, String, TIMESTAMP, Numeric, Text, ForeignKey
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from database import Base

class Lowisko(Base):
    __tablename__ = "LOWISKA"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    nazwa = Column(String(200), nullable=False)
    typ = Column(String(50))                     # staw, rzeka, jezioro
    granice = Column(Geometry('POLYGON', srid=4326))   # PostGIS
    powierzchnia_ha = Column(Numeric(10,2))
    glebokosc_max = Column(Numeric(5,2))
    opis = Column(Text)
    wlasciciel_id = Column(BigInteger, ForeignKey("UZYTKOWNICY.id"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(TIMESTAMP, nullable=True)