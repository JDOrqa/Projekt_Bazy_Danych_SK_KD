# Plik: config.py
# Ładowanie zmiennych środowiskowych i ustawień aplikacji.
# Używane przez: main.py, database.py, security.py, worker.

from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings): # Klasa do przechowywania ustawień aplikacji, ładowanych z pliku .env lub zmiennych środowiskowych.
    # Database
    DB_USER: str # Nazwa użytkownika bazy danych
    DB_PASSWORD: str # Hasło użytkownika bazy danych
    DB_NAME: str # Nazwa bazy danych
    DB_HOST: str = "localhost" # Host bazy danych
    DB_PORT: str = "5432" # Port bazy danych
    
    @property # Właściwość do generowania URL połączenia z bazą danych na podstawie innych ustawień.
    def DATABASE_URL(self) -> str: # Zwraca URL do połączenia z bazą danych w formacie wymaganym przez SQLAlchemy i asyncpg.
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}" # Przykład: postgresql+asyncpg://user:password@localhost:5432/mydatabase
    
    # JWT
    SECRET_KEY: str # Klucz używany do podpisywania JWT
    ALGORITHM: str = "HS256" # Algorytm używany do podpisywania JWT
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Email
    SMTP_HOST: str = "" # Adres serwera SMTP (np. smtp.gmail.com)
    SMTP_PORT: int = 587 # Port serwera SMTP (587 dla TLS)
    SMTP_USER: str = "" 
    SMTP_PASSWORD: str = "" 
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0" # URL do połączenia z Redis (używany do przechowywania refresh tokenów)
    
    # Upload
    UPLOAD_DIR: str = "uploads" # Katalog do przechowywania przesyłanych plików
    MAX_IMAGE_SIZE_MB: int = 10 # Maksymalny rozmiar przesyłanego obrazu w MB   
    
    class Config:
        env_file = ".env" # Plik .env powinien znajdować się w katalogu głównym projektu i zawierać wszystkie wymagane zmienne środowiskowe (DB_USER, DB_PASSWORD, DB_NAME, SECRET_KEY itp.)

settings = Settings()