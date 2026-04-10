# Plik: models/zarybienie.py
# Rejestr zarybień – data, ilość, koszt.

from sqlalchemy import Column, BigInteger, Date, Integer, Numeric, Text, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from database import Base

class Zarybienie(Base):
    __tablename__ = "ZARYBIENIA"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lowisko_id = Column(BigInteger, ForeignKey("LOWISKA.id"), nullable=False)
    gatunek_id = Column(BigInteger, ForeignKey("GATUNKI.id"), nullable=False)
    data_zarybienia = Column(Date, nullable=False)
    ilosc = Column(Integer)
    koszt = Column(Numeric(10,2))
    uwagi = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())