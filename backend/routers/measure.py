# backend/routers/measure.py
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
import logging
import cv2
import numpy as np
from typing import Optional, List, Dict, Tuple
import base64
import json
from ultralytics import YOLO
import torch

router = APIRouter()

species_model = None

def get_model(img=None):
    global species_model
    if species_model is None:
        print("LOADING YOLO MODEL")
        species_model = YOLO('./models/best10maj.pt')
    return species_model

CARD_WIDTH_MM = 85.6
CARD_HEIGHT_MM = 53.98

# ═══════════════════════════════════════════════════════
# HELPERS — GEOMETRIA
# ═══════════════════════════════════════════════════════

def order_points(pts: np.ndarray) -> np.ndarray:
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # top-left
    rect[2] = pts[np.argmax(s)]   # bottom-right
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right
    rect[3] = pts[np.argmax(diff)]  # bottom-left
    return rect

def four_point_transform(image: np.ndarray, pts: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    rect = order_points(pts)
    tl, tr, br, bl = rect
    maxWidth = max(int(np.linalg.norm(br - bl)), int(np.linalg.norm(tr - tl)))
    maxHeight = max(int(np.linalg.norm(tr - br)), int(np.linalg.norm(tl - bl)))
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype="float32")
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    return warped, M

# ═══════════════════════════════════════════════════════
# SKALA — Z MANUALNYCH PUNKTÓW KARTY
# ═══════════════════════════════════════════════════════

def get_scale_from_card_points(pts: np.ndarray) -> Tuple[float, np.ndarray]:
    ordered = order_points(pts.astype("float32"))
    tl, tr, br, bl = ordered
    card_width_px = max(np.linalg.norm(br - bl), np.linalg.norm(tr - tl))
    card_height_px = max(np.linalg.norm(tr - br), np.linalg.norm(tl - bl))
    aspect = card_width_px / (card_height_px + 1e-6)
    if aspect >= 1.0:
        mm_per_px = CARD_WIDTH_MM / card_width_px
    else:
        mm_per_px = CARD_HEIGHT_MM / card_height_px
    return mm_per_px, ordered

# ═══════════════════════════════════════════════════════
# HELPERS — SEGMENTACJA
# ═══════════════════════════════════════════════════════

def normalize_illumination(gray: np.ndarray) -> np.ndarray:
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (51, 51))
    bg = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)
    normalized = cv2.divide(gray.astype(np.float32), bg.astype(np.float32))
    normalized = cv2.normalize(normalized, None, 0, 255, cv2.NORM_MINMAX)
    return normalized.astype(np.uint8)

def build_threshold(gray: np.ndarray) -> np.ndarray:
    blurred = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)
    _, th_o = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    th_a = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                 cv2.THRESH_BINARY_INV, 31, 10)
    return cv2.bitwise_or(th_o, th_a)

def grabcut_refine(image: np.ndarray, bbox: Tuple[int, int, int, int]) -> Optional[np.ndarray]:
    x, y, bw, bh = bbox
    margin = max(5, int(min(bw, bh) * 0.05))
    ih, iw = image.shape[:2]
    x1 = max(x - margin, 0)
    y1 = max(y - margin, 0)
    x2 = min(x + bw + margin, iw)
    y2 = min(y + bh + margin, ih)
    rw, rh = x2 - x1, y2 - y1
    if rw < 10 or rh < 10:
        return None
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    mask_gc = np.zeros(image.shape[:2], np.uint8)
    try:
        cv2.grabCut(image, mask_gc, (x1, y1, rw, rh), bgd, fgd, iterCount=5, mode=cv2.GC_INIT_WITH_RECT)
    except cv2.error as e:
        print(f"[grabcut] błąd: {e}")
        return None
    fish_mask = np.where((mask_gc == cv2.GC_FGD) | (mask_gc == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    return fish_mask

def skeleton_length_px(mask: np.ndarray) -> float:
    try:
        skel = cv2.ximgproc.thinning(mask, thinningType=cv2.ximgproc.THINNING_ZHANGSUEN)
        return float(np.count_nonzero(skel)) * 1.05
    except AttributeError:
        return 0.0

# ═══════════════════════════════════════════════════════
# POMIAR RYBY
# ═══════════════════════════════════════════════════════

def measure_fish(image: np.ndarray, mm_per_px: float, card_poly: np.ndarray) -> Dict:
    h, w = image.shape[:2]
    card_mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillConvexPoly(card_mask, card_poly.astype(np.int32), 255)
    card_mask_dilated = cv2.dilate(card_mask, np.ones((12, 12), np.uint8))

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    normalized = normalize_illumination(gray)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(normalized)
    th = build_threshold(enhanced)
    th[card_mask_dilated > 0] = 0

    close_size = max(3, int(10 * mm_per_px))
    close_size = close_size if close_size % 2 == 1 else close_size + 1
    open_size = max(3, int(4 * mm_per_px))
    open_size = open_size if open_size % 2 == 1 else open_size + 1
    k_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close_size, close_size))
    k_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (open_size, open_size))
    cleaned = cv2.morphologyEx(th, cv2.MORPH_CLOSE, k_close)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, k_open)

    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return _empty_result()

    min_area = max((30 * 6) / (mm_per_px ** 2), h * w * 0.001)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    best_cnt = None
    for cnt in contours:
        if cv2.contourArea(cnt) >= min_area:
            best_cnt = cnt
            break
    if best_cnt is None:
        return _empty_result()

    x, y, bw, bh = cv2.boundingRect(best_cnt)
    gc_mask = grabcut_refine(image, (x, y, bw, bh))

    length_px = 0.0
    used_grabcut = False
    final_cnt = best_cnt

    if gc_mask is not None:
        gc_mask[card_mask_dilated > 0] = 0
        gc_contours, _ = cv2.findContours(gc_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if gc_contours:
            gc_cnt = max(gc_contours, key=cv2.contourArea)
            if cv2.contourArea(gc_cnt) >= min_area * 0.5:
                skel_len = skeleton_length_px(gc_mask)
                if skel_len > 20:
                    length_px = skel_len
                    used_grabcut = True
                    final_cnt = gc_cnt
                    print(f"[measure] Szkielet GrabCut: {length_px:.1f}px")
                else:
                    rect_gc = cv2.minAreaRect(gc_cnt)
                    length_px = max(rect_gc[1])
                    used_grabcut = True
                    final_cnt = gc_cnt

    if not used_grabcut or length_px == 0:
        rect_fb = cv2.minAreaRect(best_cnt)
        length_px = max(rect_fb[1])
        final_cnt = best_cnt

    length_cm = (length_px * mm_per_px) / 10.0
    box = np.intp(cv2.boxPoints(cv2.minAreaRect(final_cnt)))
    x2, y2, bw2, bh2 = cv2.boundingRect(final_cnt)

    return {
        "dlugosc_cm": round(length_cm, 1),
        "dlugosc_px": round(length_px, 1),
        "bbox": (int(x2), int(y2), int(bw2), int(bh2)),
        "box_points": box.tolist(),
        "confidence": 0.95 if used_grabcut else 0.85,
        "used_grabcut": used_grabcut,
        "debug_thresh": _mask_to_b64(th),
        "debug_cleaned": _mask_to_b64(cleaned),
    }

def _empty_result() -> Dict:
    return {
        "dlugosc_cm": None, "dlugosc_px": 0,
        "bbox": None, "box_points": None,
        "confidence": 0.0, "used_grabcut": False,
        "debug_thresh": None, "debug_cleaned": None,
    }

def _mask_to_b64(mask: np.ndarray) -> str:
    _, buf = cv2.imencode('.png', mask)
    return base64.b64encode(buf).decode('utf-8')

# ═══════════════════════════════════════════════════════
# DEBUG OBRAZ
# ═══════════════════════════════════════════════════════

def draw_debug_image(img: np.ndarray, card_poly: np.ndarray, fish_box: Optional[np.ndarray],
                     length_cm: Optional[float]) -> np.ndarray:
    out = img.copy()
    cv2.polylines(out, [card_poly.astype(np.int32)], True, (0, 220, 0), 3)
    for pt in card_poly.astype(np.int32):
        cv2.circle(out, tuple(pt), 7, (0, 180, 0), -1)
    if fish_box is not None:
        box = fish_box.astype(np.int32)
        cv2.polylines(out, [box], True, (0, 0, 255), 3)
        cx = int(box[:, 0].mean())
        cy = int(box[:, 1].mean())
        label = f"{length_cm:.1f} cm" if length_cm else "ryba"
        cv2.putText(out, label, (cx - 40, cy - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
    return out

# ═══════════════════════════════════════════════════════
# GŁÓWNA FUNKCJA
# ═══════════════════════════════════════════════════════

def estimate_fish_length(
    image_bytes: bytes,
    card_points: List[List[int]],
    draw_boxes: bool = True
) -> dict:
    """
    Główna funkcja pomiarowa.
    1. Dekoduje obraz.
    2. Skaluje obraz (optymalizacja wydajności).
    3. Oblicza skalę mm/piksel na podstawie punktów karty.
    4. Mierzy długość ryby (segmentacja, GrabCut, skeletonizacja).
    5. Klasyfikuje gatunek ryby przy użyciu wytrenowanego modelu YOLO.
    6. Generuje obraz debug (z zaznaczoną kartą i rybą).
    """
    # 1. Dekodowanie obrazu
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Nie można odczytać obrazu")

    # 2. Skalowanie (max 1600 pikseli)
    h, w = img.shape[:2]
    max_dim = 1600
    sf = 1.0
    if max(h, w) > max_dim:
        sf = max_dim / max(h, w)
        img = cv2.resize(img, (int(w * sf), int(h * sf)))
        # Przeskaluj również punkty karty
        card_points = [[p[0] * sf, p[1] * sf] for p in card_points]
        print(f"Przeskalowano → {img.shape[1]}x{img.shape[0]} (sf={sf:.3f})")

    # 3. Obliczenie skali (mm/piksel) na podstawie karty referencyjnej
    pts_scaled = np.array(card_points, dtype="float32")
    mm_per_px, ordered_card = get_scale_from_card_points(pts_scaled)
    print(f"Skala: {mm_per_px:.4f} mm/px")

    # 4. Pomiar długości ryby
    res = measure_fish(img, mm_per_px, ordered_card)
    conf = res.get("confidence", 0.0)

    fish_box = None
    if res.get("box_points"):
        fish_box = np.array(res["box_points"])

    # 5. Klasyfikacja gatunku (YOLO)
        # 5. Klasyfikacja gatunku (YOLO) – model detekcyjny
    gatunek = None
    ufnosc_gatunku = None
    try:
        model = get_model()  # zwraca obiekt YOLO
        # Wykonaj predykcję na obrazie
        detection_results = model(img)
        if detection_results and len(detection_results) > 0:
            # Zakładamy, że interesuje nas pierwszy obraz (indeks 0)
            boxes = detection_results[0].boxes
            if boxes is not None and len(boxes) > 0:
                # Pobierz confidences i klasy dla wszystkich wykryć
                confs = boxes.conf.cpu().numpy()
                cls_ids = boxes.cls.cpu().numpy().astype(int)
                # Wybierz wykrycie z najwyższą ufnością
                best_idx = confs.argmax()
                gatunek = detection_results[0].names[cls_ids[best_idx]]
                ufnosc_gatunku = float(confs[best_idx])
                print(f"[YOLO] Gatunek: {gatunek} (ufność: {ufnosc_gatunku:.2f})")
            else:
                print("[YOLO] Brak wykrytych obiektów")
        else:
            print("[YOLO] Brak wyników predykcji")
    except Exception as e:
        print(f"[YOLO] Błąd klasyfikacji: {e}")

    # 6. Obraz debug (z zaznaczoną kartą i rybą)
    image_base64 = None
    if draw_boxes:
        debug_img = draw_debug_image(img, ordered_card, fish_box, res.get("dlugosc_cm"))
        _, buf = cv2.imencode('.jpg', debug_img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        image_base64 = base64.b64encode(buf).decode('utf-8')

    # 7. Przygotowanie wyniku
    result = {
        "dlugosc_cm": res.get("dlugosc_cm"),
        "ufnosc_pomiaru": conf,
        "bbox": res.get("bbox"),
        "dlugosc_px": res.get("dlugosc_px"),
        "box_points": res.get("box_points"),
        "card_pts": ordered_card.tolist(),
        "card_detected": True,
        "used_grabcut": res.get("used_grabcut", False),
        "image_base64": image_base64,
        "debug_thresh": res.get("debug_thresh"),
        "debug_cleaned": res.get("debug_cleaned"),
    }

    # Dodaj gatunek i ufność (jeśli wykryto)
    if gatunek:
        result["gatunek"] = gatunek
        result["ufnosc_gatunku"] = ufnosc_gatunku

    return result

# ═══════════════════════════════════════════════════════
# ENDPOINT
# ═══════════════════════════════════════════════════════

@router.post("/fish")
async def measure_fish_endpoint(
    file: UploadFile = File(...),
    card_points: str = Form(...),
    draw_boxes: bool = Form(True),
):
    """
    Mierzy długość ryby oraz rozpoznaje gatunek.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, detail="Plik nie jest obrazem")
    contents = await file.read()
    if not contents:
        raise HTTPException(400, detail="Pusty plik")

    try:
        pts = json.loads(card_points)
        if len(pts) != 4:
            raise ValueError("Wymagane dokładnie 4 punkty")
        pts_arr = np.array(pts, dtype="float32")
        if pts_arr.shape != (4, 2):
            raise ValueError("Każdy punkt musi mieć [x, y]")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(400, detail=f"Błędne card_points: {e}")

    try:
        result = estimate_fish_length(contents, pts, draw_boxes=draw_boxes)
    except Exception as e:
        logging.exception("Błąd pomiaru")
        raise HTTPException(500, detail=f"Błąd pomiaru: {e}")

    if result.get("dlugosc_cm") is None:
        raise HTTPException(422, detail="Nie wykryto ryby na zdjęciu")

    result["sukces"] = True
    return result