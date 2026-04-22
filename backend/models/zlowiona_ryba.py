from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class ZlowionaRyba(Base):
    __tablename__ = "ZLOWIONE_RYBY"
    
    id = Column(Integer, primary_key=True, index=True)
    sesja_id = Column(Integer, ForeignKey("SESJE_POLOWU.id", ondelete="CASCADE"), nullable=False)
    gatunek_id = Column(Integer, ForeignKey("GATUNKI.id"), nullable=False)
    metoda_id = Column(Integer, ForeignKey("METODY_POLOWU.id"), nullable=True)
    przyneta_id = Column(Integer, ForeignKey("PRZYNETY.id"), nullable=True)
    
    # Dane ryby
    waga_g = Column(Integer, nullable=True)
    dlugosc_cm = Column(Float, nullable=True)
    
    # Czy ryba została wypuszczona
    wypuszczona = Column(Boolean, default=False)
    
    # Dodatkowe informacje
    zdjecie_url = Column(String(500), nullable=True)
    uwagi = Column(Text, nullable=True)
    
    # Znacznik czasowy złowienia (opcjonalny - domyślnie teraz)
    czas_zlowienia = Column(DateTime(timezone=True), server_default=func.now())
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    