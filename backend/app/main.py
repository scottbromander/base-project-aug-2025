import os
import psycopg
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import SessionLocal, engine, Base
from .models import Item
from .schemas import ItemIn, ItemOut

app = FastAPI()

origins = [o.strip() for o in os.getenv("CORS_ORIGINS","").split(",") if o.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

DB_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://appuser:apppass@db:5432/appdb")

# Dependency: DB session per-request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def ensure_tables_for_local_dev():
    # Migrations are the source of truth; this keeps first-run simple.
    Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "FastAPI is alive"}

@app.get("/health")
def health():
    try:
        with psycopg.connect(DB_URL.replace("+psycopg", "")) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                cur.fetchone()
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.get("/api/items", response_model=list[ItemOut])
def list_items(db: Session = Depends(get_db)):
    return db.query(Item).order_by(Item.id).all()

@app.post("/api/items", response_model=ItemOut, status_code=201)
def create_item(payload: ItemIn, db: Session = Depends(get_db)):
    itm = Item(name=payload.name)
    db.add(itm)
    db.commit()
    db.refresh(itm)
    return itm
