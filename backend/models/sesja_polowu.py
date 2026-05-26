# Plik: models/sesja_polowu.py
# Sesja wędkarska – czas, lokalizacja, uwagi. Powiązana z użytkownikiem i łowiskiem.
# Zawiera wiele złowionych ryb.

from sqlalchemy import Column, BigInteger, TIMESTAMP, Text, ForeignKey
from geoalchemy2 import Geography
from sqlalchemy.sql import func
from database import Base

class SesjaPolowu(Base):
    __tablename__ = "sesje_polowu"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    uzytkownik_id = Column(BigInteger, ForeignKey("UZYTKOWNICY.id"), nullable=False)
    lowisko_id = Column(BigInteger, ForeignKey("LOWISKA.id"), nullable=False)
    start_czas = Column(TIMESTAMP, nullable=False)
    koniec_czas = Column(TIMESTAMP)
    start_gps = Column(Geography('POINT', srid=4326))
    koniec_gps = Column(Geography('POINT', srid=4326))
    uwagi = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(TIMESTAMP, nullable=True)