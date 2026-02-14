from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from app.db.session import get_db
from app.db import models

router = APIRouter(tags=["runs"])

@router.get("/runs")
def list_runs(limit: int = 50, db: Session = Depends(get_db)):
    q = select(models.StrategyRun).order_by(desc(models.StrategyRun.started_at)).limit(limit)
    runs = list(db.execute(q).scalars())
    return runs
