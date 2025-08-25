FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# install deps
COPY requirements.txt .
RUN pip install -r requirements.txt

# app code is bind-mounted in compose for dev; keep an initial copy for first build
COPY . /app

EXPOSE 8000
