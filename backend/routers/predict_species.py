# backend/routers/predict_species.py
from fastapi import APIRouter, File, UploadFile, HTTPException
from ultralytics import YOLO
import cv2
import numpy as np
import io
from PIL import Image

router = APIRouter()
# Wczytaj swój wytrenowany model klasyfikacji
model = YOLO('./models/best10maj.pt')

@router.post("/predict/species")
async def predict_species(file: UploadFile = File(...)):
    """
    Endpoint do klasyfikacji gatunku ryby na podstawie przesłanego zdjęcia.
    """
    # 1. Walidacja pliku
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, detail="Nieprawidłowy format pliku.")

    # 2. Odczyt obrazu
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # 3. Predykcja modelem YOLO
    results = model(img)

    # 4. Parsowanie wyników
    if not results or len(results) == 0:
        raise HTTPException(400, detail="Nie udało się sklasyfikować obrazu.")

    # Pobranie nazwy i ufności dla najlepszej klasy
    top_class_index = results[0].probs.top1
    top_class_name = results[0].names[top_class_index]
    top_class_confidence = float(results[0].probs.top1conf)

    # 5. Zwrócenie wyniku
    return {
        "gatunek": top_class_name,
        "ufnosc": top_class_confidence
    }