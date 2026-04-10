# Plik: models/historia_populacji.py
# Zapisywanie szacowanej populacji w czasie (np. z inwentaryzacji).

from sqlalchemy import Column, BigInteger, Date, Integer, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from database import Base

class HistoriaPopulacji(Base):
    __tablename__ = "HISTORIA_POPULACJI"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lowisko_id = Column(BigInteger, ForeignKey("LOWISKA.id"), nullable=False)
    gatunek_id = Column(BigInteger, ForeignKey("GATUNKI.id"), nullable=False)
    data = Column(Date, nullable=False)
    populacja_oszacowana = Column(Integer)
    created_at = Column(TIMESTAMP, server_default=func.now())