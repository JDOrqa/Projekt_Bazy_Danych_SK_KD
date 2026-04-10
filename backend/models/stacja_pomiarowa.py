# Plik: models/stacja_pomiarowa.py
# Stacje pomiarowe IoT, każda należy do łowiska.
# Używane przez API IoT i odczyty środowiskowe.

from sqlalchemy import Column, BigInteger, String, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from geoalchemy2 import Geography
from sqlalchemy.sql import func
from database import Base

class StacjaPomiarowa(Base):
    __tablename__ = "STACJE_POMIAROWE"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lowisko_id = Column(BigInteger, ForeignKey("LOWISKA.id"), nullable=False)
    nazwa = Column(String(200), nullable=False)
    lokalizacja = Column(Geography('POINT', srid=4326))  # współrzędne GPS
    typ_czujnikow = Column(JSONB)                        # lista czujników: temp, tlen, pH
    last_seen = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())