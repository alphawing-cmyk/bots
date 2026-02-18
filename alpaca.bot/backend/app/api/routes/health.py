from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import redis
from app.db.session import get_db
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {
        "ok": True,
        "service": "alpaca-bot-api",
    }


@router.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    # lightweight DB probe
    db.execute(text("SELECT 1"))
    return {
        "ok": True,
        "db": "ok",
    }


@router.get("/health/redis")
def health_redis():
    r = redis.Redis.from_url(settings.celery_broker_url)
    r.ping()
    return {
        "ok": True,
        "redis": "ok",
        "broker": settings.celery_broker_url,
    }
