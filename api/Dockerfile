FROM python:3.13-slim

WORKDIR /app

# Install deps first for better layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code (includes committed model artifacts under app/artifacts/).
COPY app ./app

# Safety net: if model artifacts are missing, train at build time.
RUN python -c "import pathlib,sys; sys.exit(0 if pathlib.Path('app/artifacts/model_congestion.joblib').exists() else 1)" \
    || python -m app.ml.train

EXPOSE 8000

# Shell form so ${PORT} (injected by Render/most PaaS) is expanded.
# Falls back to 8000 locally (docker-compose maps 8000:8000).
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
