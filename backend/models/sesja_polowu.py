from sqlalchemy import Column, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geography
from database import Base

class SesjaPolowu(Base):
    __tablename__ = "SESJE_POLOWU"
    
    id = Column(Integer, primary_key=True, index=True)
    uzytkownik_id = Column(Integer, ForeignKey("UZYTKOWNICY.id"), nullable=False)
    lowisko_id = Column(Integer, ForeignKey("LOWISKA.id"), nullable=False)
    start_czas = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    koniec_czas = Column(DateTime(timezone=True), nullable=True)
    start_gps = Column(Geography("POINT", srid=4326), nullable=True)
    koniec_gps = Column(Geography("POINT", srid=4326), nullable=True)
    uwagi = Column(Text, nullable=True)