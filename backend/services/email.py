# Plik: services/email.py
# Mock wysyłania emaili – w produkcji zastąpić np. aiosmtplib.

import logging
from config import settings

logger = logging.getLogger(__name__)

async def send_verification_email(email: str, user_id: int, token: str) -> None:
   #Symuluje wysyłkę linku weryfikacyjnego
    link = f"{settings.FRONTEND_URL}/verify-email?user_id={user_id}&token={token}"
    logger.info(f"Weryfikacja email: {email} -> {link}")
    # W rzeczywistości tutaj kod wysyłki przez SMTP