from __future__ import annotations
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from app.tasks.celery_app import celery
from app.db.session import SessionLocal
from app.db import models
from app.strategies.registry import build_registry
from app.engine.execution import execute_signals
from app.engine.risk import RiskLimits
from app.core.events import publish_event


# stub market data provider (replace with Alpaca data API / Polygon later)
class MarketData:
    def get_recent_closes(self, symbol: str, limit: int = 60) -> list[float]:
        # TODO: implement real data fetch + caching
        return []

@celery.task(name="app.tasks.runner.tick")
def tick():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        enabled = list(db.execute(
            select(models.StrategyConfig).where(models.StrategyConfig.enabled == True)
        ).scalars())

        # decide due strategies
        due: list[models.StrategyConfig] = []
        for s in enabled:
            if s.last_run_at is None:
                due.append(s)
                continue
            next_at = s.last_run_at + timedelta(seconds=s.interval_seconds)
            if now >= next_at:
                due.append(s)

        for s in due:
            run_strategy.delay(s.id)

    finally:
        db.close()

@celery.task(name="app.tasks.runner.run_strategy")
def run_strategy(strategy_id: str):
    db = SessionLocal()
    started = datetime.now(timezone.utc)

    run = models.StrategyRun(strategy_id=strategy_id, status="running", started_at=started)
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        strat_cfg = db.get(models.StrategyConfig, strategy_id)
        if not strat_cfg or not strat_cfg.enabled:
            run.status = "error"
            run.message = "Strategy disabled or missing"
            run.finished_at = datetime.now(timezone.utc)
            db.commit()
            return

        market_data = MarketData()
        registry = build_registry(market_data)

        if strat_cfg.type not in registry:
            raise RuntimeError(f"Unknown strategy type: {strat_cfg.type}")

        strategy = registry[strat_cfg.type]()  # instance
        signals = strategy.run(symbols=strat_cfg.symbols or [], params=strat_cfg.params or {})

        # risk limits could come from BotSetting
        risk = RiskLimits()
        orders = execute_signals(signals, risk=risk) if signals else []

        # store results
        run.signals = {"count": len(signals), "items": [s.__dict__ for s in signals]}
        run.orders = orders
        run.metrics = {"orders_placed": len(orders)}
        run.status = "ok"
        run.finished_at = datetime.now(timezone.utc)

        strat_cfg.last_run_at = datetime.now(timezone.utc)
        strat_cfg.updated_at = datetime.now(datetime.timezone.utc)

        db.commit()

        publish_event({
            "type": "run_completed",
            "strategy_id": strategy_id,
            "run": {
                "id": run.id,
                "strategy_id": run.strategy_id,
                "started_at": run.started_at,
                "finished_at": run.finished_at,
                "status": run.status,
                "message": run.message,
                "signals": run.signals,
                "orders": run.orders,
                "metrics": run.metrics,
            }
        })


    except Exception as e:
        run.status = "error"
        run.message = str(e)
        run.finished_at = datetime.now(timezone.utc)
        db.commit()

        publish_event({
            "type": "run_error",
            "strategy_id": strategy_id,
            "run": {
                "id": run.id,
                "strategy_id": run.strategy_id,
                "started_at": run.started_at,
                "finished_at": run.finished_at,
                "status": run.status,
                "message": run.message,
                "signals": run.signals,
                "orders": run.orders,
                "metrics": run.metrics,
            }
        })

    finally:
        db.close()
