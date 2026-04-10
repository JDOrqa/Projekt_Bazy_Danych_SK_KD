# Plik: models/historia_wizyt.py
# Każde wejście użytkownika na łowisko (rejestracja przybycia).

from sqlalchemy import Column, BigInteger, TIMESTAMP, Text, ForeignKey
from geoalchemy2 import Geography
from sqlalchemy.sql import func
from database import Base

class HistoriaWizyt(Base):
    __tablename__ = "HISTORIA_WIZYT"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    uzytkownik_id = Column(BigInteger, ForeignKey("UZYTKOWNICY.id"), nullable=False)
    lowisko_id = Column(BigInteger, ForeignKey("LOWISKA.id"), nullable=False)
    data_wizyty = Column(TIMESTAMP, nullable=False)
    lokalizacja_przybycia = Column(Geography('POINT', srid=4326))
    uwagi = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())