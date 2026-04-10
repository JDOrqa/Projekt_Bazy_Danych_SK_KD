# Plik: models/limit_polowowy.py
# Limity dla gatunku na łowisku: wymiar minimalny, limit dzienny, okres ochronny.
# Używane podczas rejestracji połowu.

from sqlalchemy import Column, BigInteger, Numeric, Integer, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import DATERANGE
from sqlalchemy.sql import func
from database import Base

class LimitPolowowy(Base):
    __tablename__ = "LIMITY_POLOWOWE"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lowisko_id = Column(BigInteger, ForeignKey("LOWISKA.id"), nullable=False)
    gatunek_id = Column(BigInteger, ForeignKey("GATUNKI.id"), nullable=False)
    wymiar_min_cm = Column(Numeric(5,1))
    limit_dzienny = Column(Integer)
    sezon_ochronny = Column(DATERANGE)    # np. [2025-01-01, 2025-06-30)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())