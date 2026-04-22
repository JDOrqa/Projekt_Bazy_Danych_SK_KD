from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from database import Base

class SesjaPolowu(Base):
    __tablename__ = "SESJE_POLOWU"
    
    id = Column(Integer, primary_key=True, index=True)
    uzytkownik_id = Column(Integer, ForeignKey("UZYTKOWNICY.id"), nullable=False)
    lowisko_id = Column(Integer, ForeignKey("LOWISKA.id"), nullable=False)
    
    # Dane podstawowe
    data_rozpoczecia = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    data_zakonczenia = Column(DateTime(timezone=True), nullable=True)
    
    # Lokalizacja GPS (PostGIS)
    start_gps = Column(Geometry("POINT", srid=4326), nullable=True)
    koniec_gps = Column(Geometry("POINT", srid=4326), nullable=True)
    
    # Opcjonalne dane
    uwagi = Column(Text, nullable=True)
    
    # Znaczniki czasowe
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())