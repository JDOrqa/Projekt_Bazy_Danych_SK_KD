# Plik: models/metoda_polowu.py
# Słownik metod połowu (spinning, grunt, muchówka itp.)

from sqlalchemy import Column, BigInteger, String, TIMESTAMP, Text
from sqlalchemy.sql import func
from database import Base

class MetodaPolowu(Base):
    __tablename__ = "METODY_POLOWU"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    nazwa = Column(String(100), unique=True, nullable=False)
    opis = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())