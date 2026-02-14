from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.db.session import get_db
from app.db import models

router = APIRouter(tags=["metrics"])

@router.get("/metrics/overview")
def overview(db: Session = Depends(get_db)):
    total_strats = db.execute(select(func.count()).select_from(models.StrategyConfig)).scalar_one()
    enabled = db.execute(select(func.count()).select_from(models.StrategyConfig).where(models.StrategyConfig.enabled == True)).scalar_one()
    total_runs = db.execute(select(func.count()).select_from(models.StrategyRun)).scalar_one()
    errors = db.execute(select(func.count()).select_from(models.StrategyRun).where(models.StrategyRun.status == "error")).scalar_one()
    return {
        "strategies_total": total_strats,
        "strategies_enabled": enabled,
        "runs_total": total_runs,
        "runs_errors": errors,
    }
