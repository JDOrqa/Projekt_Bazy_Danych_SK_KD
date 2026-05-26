# Plik: services/email.py
# Mock wysyłania emaili – w produkcji zastąpić np. aiosmtplib.

import logging
from config import settings

logger = logging.getLogger(__name__) # Tworzymy logger dla tego modułu, aby logować informacje o wysyłce emaili. W produkcji można skonfigurować logger do zapisywania do pliku lub zewnętrznego systemu logowania.

async def send_verification_email(email: str, user_id: int, token: str) -> None:
   #Na razie symuluje wysyłkę linku weryfikacyjnego
    link = f"{settings.FRONTEND_URL}/verify-email?user_id={user_id}&token={token}" # Generujemy link weryfikacyjny, który frontend będzie mógł obsłużyć (np. w EmailVerify.js). Link zawiera user_id i token jako parametry query.
    logger.info(f"Weryfikacja email: {email} -> {link}")  # Logujemy link weryfikacyjny zamiast wysyłać email. W produkcji tu będzie kod do wysyłki emaila (np. aiosmtplib). 
    