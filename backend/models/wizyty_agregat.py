# Plik: models/wizyty_agregat.py
# Zagregowane liczniki wizyt – dla szybkiego podglądu.

from sqlalchemy import Column, BigInteger, Integer, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from database import Base

class WizytyAgregat(Base):
    __tablename__ = "WIZYTY_AGREGAT"
    
    uzytkownik_id = Column(BigInteger, ForeignKey("UZYTKOWNICY.id"), primary_key=True)
    lowisko_id = Column(BigInteger, ForeignKey("LOWISKA.id"), primary_key=True)
    liczba_wizyt = Column(Integer, default=0)
    ostatnia_wizyta = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())