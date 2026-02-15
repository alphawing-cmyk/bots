from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db.session import get_db
from app.db import models

router = APIRouter(tags=["strategies"])

class StrategyIn(BaseModel):
    name: str
    type: str
    enabled: bool = False
    interval_seconds: int = Field(default=60, ge=5, le=86400)
    symbols: list[str] = Field(default_factory=list)
    params: dict = Field(default_factory=dict)

class StrategyOut(StrategyIn):
    id: str
    last_run_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

@router.get("/strategies", response_model=list[StrategyOut])
def list_strategies(db: Session = Depends(get_db)):
    items = list(db.execute(select(models.StrategyConfig)).scalars())
    return items

@router.post("/strategies", response_model=StrategyOut)
def create_strategy(payload: StrategyIn, db: Session = Depends(get_db)):
    exists = db.execute(select(models.StrategyConfig).where(models.StrategyConfig.name == payload.name)).scalar_one_or_none()
    if exists:
        raise HTTPException(409, "Strategy name already exists")

    s = models.StrategyConfig(
        name=payload.name,
        type=payload.type,
        enabled=payload.enabled,
        interval_seconds=payload.interval_seconds,
        symbols=payload.symbols,
        params=payload.params,
        updated_at=datetime.now(timezone.utc),
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s

@router.patch("/strategies/{strategy_id}", response_model=StrategyOut)
def update_strategy(strategy_id: str, payload: StrategyIn, db: Session = Depends(get_db)):
    s = db.get(models.StrategyConfig, strategy_id)
    if not s:
        raise HTTPException(404, "Not found")

    s.name = payload.name
    s.type = payload.type
    s.enabled = payload.enabled
    s.interval_seconds = payload.interval_seconds
    s.symbols = payload.symbols
    s.params = payload.params
    s.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(s)
    return s

@router.delete("/strategies/{strategy_id}")
def delete_strategy(strategy_id: str, db: Session = Depends(get_db)):
    s = db.get(models.StrategyConfig, strategy_id)
    if not s:
        raise HTTPException(404, "Not found")
    db.delete(s)
    db.commit()
    return {"ok": True}
