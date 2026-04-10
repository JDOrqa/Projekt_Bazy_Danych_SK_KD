# Plik: models/przyneta.py
# Rodzaje przynęt (robak, kukurydza, wobler itp.)

from sqlalchemy import Column, BigInteger, String, TIMESTAMP, Text
from sqlalchemy.sql import func
from database import Base

class Przyneta(Base):
    __tablename__ = "PRZYNETY"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    nazwa = Column(String(100), unique=True, nullable=False)
    opis = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())