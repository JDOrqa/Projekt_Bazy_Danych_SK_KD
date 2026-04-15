FROM python:3.12-slim

WORKDIR /app

# Instalacja zależności systemowych (GDAL dla PostGIS, konieczne dla geoalchemy2)
RUN apt-get update && apt-get install -y gdal-bin libgdal-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]