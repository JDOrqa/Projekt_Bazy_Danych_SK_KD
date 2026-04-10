from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, ForeignKey, Table, Integer, Float, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship  # <--- DODANE
from geoalchemy2 import Geometry, Geography
from database import Base
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Tabela asocjacyjna
uzytkownik_role = Table(
    "uzytkownik_role",
    Base.metadata,
    Column("uzytkownik_id", BigInteger, ForeignKey("uzytkownicy.id"), primary_key=True),
    Column("rola_id", BigInteger, ForeignKey("role.id"), primary_key=True),
)

class Uzytkownik(Base):
    __tablename__ = "uzytkownicy"
    id = Column(BigInteger, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    haslo_hash = Column(String, nullable=False)
    imie = Column(String)
    nazwisko = Column(String)
    nr_licencji = Column(String)
    status = Column(String, default="aktywny")
    zgoda_marketingowa = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    roles = relationship("Rola", secondary=uzytkownik_role, back_populates="uzytkownicy")
    lowiska = relationship("Lowisko", back_populates="wlasciciel")
    sesje = relationship("SesjaPolowu", back_populates="uzytkownik")

    def verify_password(self, plain_password):
        return pwd_context.verify(plain_password, self.haslo_hash)

    @staticmethod
    def hash_password(plain_password):
        return pwd_context.hash(plain_password)

class Rola(Base):
    __tablename__ = "role"
    id = Column(BigInteger, primary_key=True)
    nazwa = Column(String, unique=True, nullable=False)
    opis = Column(Text)
    uzytkownicy = relationship("Uzytkownik", secondary=uzytkownik_role, back_populates="roles")

class Lowisko(Base):
    __tablename__ = "lowiska"
    id = Column(BigInteger, primary_key=True)
    nazwa = Column(String, nullable=False)
    typ = Column(String)
    granice = Column(Geometry("POLYGON", srid=4326))
    powierzchnia_ha = Column(Float)
    glebokosc_max = Column(Float)
    opis = Column(Text, nullable=True)
    wlasciciel_id = Column(BigInteger, ForeignKey("uzytkownicy.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    wlasciciel = relationship("Uzytkownik", back_populates="lowiska")
    sesje = relationship("SesjaPolowu", back_populates="lowisko")

class SesjaPolowu(Base):
    __tablename__ = "sesje_polowu"
    id = Column(BigInteger, primary_key=True)
    uzytkownik_id = Column(BigInteger, ForeignKey("uzytkownicy.id"))
    lowisko_id = Column(BigInteger, ForeignKey("lowiska.id"))
    start_czas = Column(DateTime(timezone=True), server_default=func.now())
    koniec_czas = Column(DateTime(timezone=True), nullable=True)
    start_gps = Column(Geography("POINT", srid=4326))
    koniec_gps = Column(Geography("POINT", srid=4326))
    uwagi = Column(Text)

    uzytkownik = relationship("Uzytkownik", back_populates="sesje")
    lowisko = relationship("Lowisko", back_populates="sesje")