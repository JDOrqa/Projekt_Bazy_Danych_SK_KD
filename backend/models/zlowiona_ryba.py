# Plik: models/zlowiona_ryba.py
# Pojedyncza ryba złowiona podczas sesji. Waga, długość, metoda, przynęta.
# Powiązana ze zdjęciami.

from sqlalchemy import Column, BigInteger, Numeric, Boolean, TIMESTAMP, Text, ForeignKey
from geoalchemy2 import Geography
from sqlalchemy.sql import func
from database import Base

class ZlowionaRyba(Base):
    __tablename__ = "zlowione_ryby"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    sesja_id = Column(BigInteger, ForeignKey("SESJE_POLOWU.id"), nullable=False)
    gatunek_id = Column(BigInteger, ForeignKey("GATUNKI.id"), nullable=False)
    metoda_id = Column(BigInteger, ForeignKey("METODY_POLOWU.id"))
    przyneta_id = Column(BigInteger, ForeignKey("PRZYNETY.id"))
    waga_kg = Column(Numeric(6,2))
    dlugosc_cm = Column(Numeric(5,1))
    wypuszczona = Column(Boolean, default=True)
    pozycja_gps = Column(Geography('POINT', srid=4326))
    czas_zlowienia = Column(TIMESTAMP, nullable=False)
    uwagi = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(TIMESTAMP, nullable=True)