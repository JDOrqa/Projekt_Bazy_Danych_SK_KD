# Plik: models/kolejka_przetwarzania.py
# Alternatywna tabela do kolejki (opcjonalna, jeśli nie używamy Redis RQ).
# Przechowuje zadania przetwarzania zdjęć.

from sqlalchemy import Column, BigInteger, String, TIMESTAMP, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from database import Base

class KolejkaPrzetwarzania(Base):
    __tablename__ = "KOLEJKA_PRZETWARZANIA"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    typ_zadania = Column(String(100))   # "analyze_fish"
    referencja_id = Column(BigInteger)  # id zdjęcia
    status = Column(String(20), default="pending")  # pending, processing, completed, failed
    dane = Column(JSONB)
    created_at = Column(TIMESTAMP, server_default=func.now())
    started_at = Column(TIMESTAMP)
    completed_at = Column(TIMESTAMP)
    blad = Column(Text)