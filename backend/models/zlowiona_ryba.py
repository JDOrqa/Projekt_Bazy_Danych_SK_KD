from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
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
    
    # Wypuszczenie
    wypuszczona = Column(Boolean, default=False)
    powod_wypuszczenia = Column(String(200), nullable=True)  # "za_mala", "za_duza", "chroniona", "no_kill"
    
    # Naruszenie limitów
    narusza_limit = Column(Boolean, default=False)
    powod_naruszenia = Column(String(200), nullable=True)
    ostrzezenie_wyswietlone = Column(Boolean, default=False)
    
    # Dodatkowe informacje
    zdjecie_url = Column(String(500), nullable=True)
    uwagi = Column(Text, nullable=True)
    
    czas_zlowienia = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
