# Plik: models/log_audytu.py
# Niemodyfikowalny log wszystkich krytycznych operacji (INSERT, UPDATE, DELETE).
# Używane przez serwis audit_log.

from sqlalchemy import Column, BigInteger, String, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from database import Base

class LogAudytu(Base):
    __tablename__ = "LOGI_AUDYTU"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    uzytkownik_id = Column(BigInteger, ForeignKey("UZYTKOWNICY.id"), nullable=False)
    tabela = Column(String(100), nullable=False)
    rekord_id = Column(BigInteger, nullable=False)
    akcja = Column(String(20), nullable=False)   # INSERT, UPDATE, DELETE
    stare_dane = Column(JSONB)
    nowe_dane = Column(JSONB)
    data_czas = Column(TIMESTAMP, server_default=func.now())