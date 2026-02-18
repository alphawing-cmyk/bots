from __future__ import annotations
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, func
from app.db.session import get_db
from app.db import models

router = APIRouter(tags=["symbols"])


# ---------- Schemas ----------

class SymbolIn(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=32)
    name: str | None = Field(default=None, max_length=200)
    exchange: str | None = Field(default=None, max_length=64)
    asset_class: str | None = Field(default=None, max_length=64)
    enabled: bool = True
    meta: dict = Field(default_factory=dict)

class SymbolPatch(BaseModel):
    # all optional for PATCH
    symbol: str | None = Field(default=None, min_length=1, max_length=32)
    name: str | None = Field(default=None, max_length=200)
    exchange: str | None = Field(default=None, max_length=64)
    asset_class: str | None = Field(default=None, max_length=64)
    enabled: bool | None = None
    meta: dict | None = None

class SymbolOut(BaseModel):
    id: str
    symbol: str
    name: str | None = None
    exchange: str | None = None
    asset_class: str | None = None
    enabled: bool
    meta: dict
    created_at: datetime
    updated_at: datetime


class SymbolsBulkUpsertIn(BaseModel):
    """
    Upsert by `symbol` (ticker). Useful for quick import.
    """
    items: list[SymbolIn] = Field(default_factory=list)


# ---------- Helpers ----------

def normalize_ticker(t: str) -> str:
    return t.strip().upper()


# ---------- Routes ----------

@router.get("/symbols", response_model=list[SymbolOut])
def list_symbols(
    q: str | None = None,
    enabled: bool | None = None,
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(models.Symbol)

    if enabled is not None:
        stmt = stmt.where(models.Symbol.enabled == enabled)

    if q:
        qq = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(models.Symbol.symbol).like(qq),
                func.lower(models.Symbol.name).like(qq),
                func.lower(models.Symbol.exchange).like(qq),
                func.lower(models.Symbol.asset_class).like(qq),
            )
        )

    stmt = stmt.order_by(models.Symbol.symbol.asc()).limit(limit).offset(offset)
    return list(db.execute(stmt).scalars())


@router.get("/symbols/{symbol_id}", response_model=SymbolOut)
def get_symbol(symbol_id: str, db: Session = Depends(get_db)):
    s = db.get(models.Symbol, symbol_id)
    if not s:
        raise HTTPException(404, "Symbol not found")
    return s


@router.post("/symbols", response_model=SymbolOut)
def create_symbol(payload: SymbolIn, db: Session = Depends(get_db)):
    ticker = normalize_ticker(payload.symbol)

    exists = db.execute(
        select(models.Symbol).where(models.Symbol.symbol == ticker)
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(409, "Symbol already exists")

    now = datetime.utcnow()
    s = models.Symbol(
        symbol=ticker,
        name=payload.name,
        exchange=payload.exchange,
        asset_class=payload.asset_class,
        enabled=payload.enabled,
        meta=payload.meta or {},
        created_at=now,
        updated_at=now,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.patch("/symbols/{symbol_id}", response_model=SymbolOut)
def update_symbol(symbol_id: str, payload: SymbolPatch, db: Session = Depends(get_db)):
    s = db.get(models.Symbol, symbol_id)
    if not s:
        raise HTTPException(404, "Symbol not found")

    # If updating ticker, check uniqueness
    if payload.symbol is not None:
        ticker = normalize_ticker(payload.symbol)
        if ticker != s.symbol:
            exists = db.execute(
                select(models.Symbol).where(models.Symbol.symbol == ticker)
            ).scalar_one_or_none()
            if exists:
                raise HTTPException(409, "Symbol already exists")
            s.symbol = ticker

    if payload.name is not None:
        s.name = payload.name
    if payload.exchange is not None:
        s.exchange = payload.exchange
    if payload.asset_class is not None:
        s.asset_class = payload.asset_class
    if payload.enabled is not None:
        s.enabled = payload.enabled
    if payload.meta is not None:
        # replace meta (you can switch to merge if you prefer)
        s.meta = payload.meta

    s.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(s)
    return s


@router.delete("/symbols/{symbol_id}")
def delete_symbol(symbol_id: str, db: Session = Depends(get_db)):
    s = db.get(models.Symbol, symbol_id)
    if not s:
        raise HTTPException(404, "Symbol not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


@router.post("/symbols/bulk", response_model=list[SymbolOut])
def bulk_upsert_symbols(payload: SymbolsBulkUpsertIn, db: Session = Depends(get_db)):
    """
    Upsert by ticker symbol. Handy for quickly adding many tickers.

    - If ticker exists, update its fields.
    - If not, insert it.
    """
    now = datetime.utcnow()
    out: list[models.Symbol] = []

    for item in payload.items:
        ticker = normalize_ticker(item.symbol)

        existing = db.execute(
            select(models.Symbol).where(models.Symbol.symbol == ticker)
        ).scalar_one_or_none()

        if existing is None:
            s = models.Symbol(
                symbol=ticker,
                name=item.name,
                exchange=item.exchange,
                asset_class=item.asset_class,
                enabled=item.enabled,
                meta=item.meta or {},
                created_at=now,
                updated_at=now,
            )
            db.add(s)
            out.append(s)
        else:
            existing.name = item.name
            existing.exchange = item.exchange
            existing.asset_class = item.asset_class
            existing.enabled = item.enabled
            existing.meta = item.meta or {}
            existing.updated_at = now
            out.append(existing)

    db.commit()

    # refresh inserted ones so IDs are populated
    for s in out:
        try:
            db.refresh(s)
        except Exception:
            pass

    return out
