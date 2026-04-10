# Plik: models/zdjecie_ryby.py
# Zdjęcia wykonane przez użytkownika. Powiązane z konkretną rybą.
# Używane przez worker AI do analizy.

from sqlalchemy import Column, BigInteger, String, TIMESTAMP, Text, ForeignKey
from geoalchemy2 import Geography
from sqlalchemy.sql import func
from database import Base

class ZdjecieRyby(Base):
    __tablename__ = "ZDJECIA_RYB"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    zlowiona_ryba_id = Column(BigInteger, ForeignKey("ZLOWIONE_RYBY.id"), nullable=False)
    url_zdjecia = Column(Text, nullable=False)      # ścieżka do pliku
    lokalizacja_gps = Column(Geography('POINT', srid=4326))
    czas_wykonania = Column(TIMESTAMP)
    checksum = Column(String(64))                   # SHA256 weryfikacja integralności
    created_at = Column(TIMESTAMP, server_default=func.now())
    deleted_at = Column(TIMESTAMP, nullable=True)