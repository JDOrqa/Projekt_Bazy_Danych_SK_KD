# Plik: models/pomiar_ryby.py
# Szczegółowe pomiary punktów (głowa, ogon) – dla potrzeb weryfikacji.

from sqlalchemy import Column, BigInteger, Integer, String, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from database import Base

class PomiarRyby(Base):
    __tablename__ = "POMIARY_RYB"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    wynik_przetwarzania_id = Column(BigInteger, ForeignKey("WYNIKI_PRZETWARZANIA.id", ondelete="CASCADE"), nullable=False)
    punkt_glowy = Column(JSONB)      # {x: 100, y: 200}
    punkt_ogona = Column(JSONB)
    dlugosc_px = Column(Integer)
    metoda = Column(String(50))      # "ai_yolo", "manual"
    zweryfikowane_przez = Column(BigInteger, ForeignKey("UZYTKOWNICY.id"), nullable=True)
    data_weryfikacji = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())