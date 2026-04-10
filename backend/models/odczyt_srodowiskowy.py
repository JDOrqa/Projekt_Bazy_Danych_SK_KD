# Plik: models/odczyt_srodowiskowy.py
# Pomiary z stacji – temperatura, tlen, pH, mętność.
# Powiązane ze stacją pomiarową.

from sqlalchemy import Column, BigInteger, TIMESTAMP, Numeric, ForeignKey
from sqlalchemy.sql import func
from database import Base

class OdczytSrodowiskowy(Base):
    __tablename__ = "ODCZYTY_SRODOWISKOWE"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    stacja_id = Column(BigInteger, ForeignKey("STACJE_POMIAROWE.id"), nullable=False)
    czas_odczytu = Column(TIMESTAMP, nullable=False)
    temperatura_wody_c = Column(Numeric(5,2))
    poziom_tlenu_mgl = Column(Numeric(5,2))
    ph = Column(Numeric(3,2))
    metnosc_ntu = Column(Numeric(6,2))
    created_at = Column(TIMESTAMP, server_default=func.now())