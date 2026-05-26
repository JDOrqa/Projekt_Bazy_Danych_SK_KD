from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime

from database import get_db
from dependencies.auth import get_current_user
from models.uzytkownik import Uzytkownik
from models.sesja_polowu import SesjaPolowu
from models.zlowiona_ryba import ZlowionaRyba
from models.lowisko import Lowisko
from models.gatunek import Gatunek
from models.metoda_polowu import MetodaPolowu
from models.przyneta import Przyneta

from schemas.sesja import (
    SesjaStartRequest, SesjaEndRequest, SesjaUpdateRequest,
    SesjaResponse, SesjaDetailResponse
)
from schemas.ryba import (
    ZlowionaRybaCreateRequest, ZlowionaRybaUpdateRequest,
    ZlowionaRybaResponse
)

from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point

router = APIRouter()