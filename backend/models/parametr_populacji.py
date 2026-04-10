# Plik: models/parametr_populacji.py
# Parametry modelu populacji dla danego gatunku na łowisku.
# Używane do wyznaczania limitów.

from sqlalchemy import Column, BigInteger, Numeric, Integer, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from database import Base

class ParametrPopulacji(Base):
    __tablename__ = "PARAMETRY_POPULACJI"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lowisko_id = Column(BigInteger, ForeignKey("LOWISKA.id"), nullable=False)
    gatunek_id = Column(BigInteger, ForeignKey("GATUNKI.id"), nullable=False)
    wspolczynnik_r = Column(Numeric(5,3))      # przyrost naturalny
    smiertelnosc = Column(Numeric(5,3))
    pojemnosc_K = Column(Integer)              # pojemność środowiska
    poziom_bezpieczny = Column(Integer)        # minimalna populacja
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())