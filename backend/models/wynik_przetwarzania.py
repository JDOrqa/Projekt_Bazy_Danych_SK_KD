# Plik: models/wynik_przetwarzania.py
# Wynik analizy zdjęcia przez AI (YOLO). Bounding box, długość, skala.
# Może być zweryfikowany przez moderatora.

from sqlalchemy import Column, BigInteger, Integer, Numeric, Boolean, String, TIMESTAMP, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from database import Base

class WynikPrzetwarzania(Base):
    __tablename__ = "WYNIKI_PRZETWARZANIA"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    zdjecie_id = Column(BigInteger, ForeignKey("ZDJECIA_RYB.id", ondelete="CASCADE"), nullable=False)
    bbox = Column(JSONB)                    # [x1,y1,x2,y2]
    dlugosc_px = Column(Integer)
    dlugosc_oszacowana_cm = Column(Numeric(5,1))
    skala_cm_na_px = Column(Numeric(10,5))
    url_maski = Column(Text)
    gatunek = Column(String(200), nullable=True)
    ufnosc_gatunku = Column(Numeric(3,2), nullable=True)
    wersja_algorytmu = Column(String(50))
    ufnosc = Column(Numeric(3,2))
    zweryfikowane = Column(Boolean, default=False)
    zweryfikowane_przez = Column(BigInteger, ForeignKey("UZYTKOWNICY.id"), nullable=True)
    przetworzono = Column(TIMESTAMP, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())