FROM python:3.12-slim-bookworm

WORKDIR /app

# Instalacja zależności systemowych (GDAL dla PostGIS + OpenGL dla OpenCV)
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]