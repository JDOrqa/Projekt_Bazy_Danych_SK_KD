from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.sql import func
from database import Base

class ZlowionaRyba(Base):
    __tablename__ = "ZLOWIONE_RYBY"
    
    id = Column(Integer, primary_key=True, index=True)
    sesja_id = Column(Integer, ForeignKey("SESJE_POLOWU.id", ondelete="CASCADE"), nullable=False)
    gatunek_id = Column(Integer, ForeignKey("GATUNKI.id"), nullable=False)
    metoda_id = Column(Integer, ForeignKey("METODY_POLOWU.id"), nullable=True)
    przyneta_id = Column(Integer, ForeignKey("PRZYNETY.id"), nullable=True)
    waga_kg = Column(Integer, nullable=True)
    dlugosc_cm = Column(Float, nullable=True)
    wypuszczona = Column(Boolean, default=False)
    uwagi = Column(Text, nullable=True)
    czas_zlowienia = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())