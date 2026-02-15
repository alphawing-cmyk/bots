from __future__ import annotations
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, and_
from app.db.session import get_db
from app.db import models

router = APIRouter(tags=["runs"])

@router.get("/runs")
def list_runs(
    limit: int = Query(100, ge=1, le=500),
    status: str | None = None,              # running|ok|error
    strategy_id: str | None = None,
    since: datetime | None = None,           # ISO datetime
    until: datetime | None = None,           # ISO datetime
    db: Session = Depends(get_db),
):
    q = select(models.StrategyRun)

    clauses = []
    if status:
        clauses.append(models.StrategyRun.status == status)
    if strategy_id:
        clauses.append(models.StrategyRun.strategy_id == strategy_id)
    if since:
        clauses.append(models.StrategyRun.started_at >= since)
    if until:
        clauses.append(models.StrategyRun.started_at <= until)

    if clauses:
        q = q.where(and_(*clauses))

    q = q.order_by(desc(models.StrategyRun.started_at)).limit(limit)
    runs = list(db.execute(q).scalars())
    return runs
