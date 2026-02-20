from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import select
from celery.utils.log import get_task_logger

from app.tasks.celery_app import celery
from app.db.session import SessionLocal
from app.db import models
from app.core.events import publish_event
from app.core.config import settings
from app.engine.massive_service import MassiveDataService

logger = get_task_logger(__name__)


@celery.task(
    name="app.tasks.runner.tick",
    bind=True,
    acks_late=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
)
def tick(self) -> dict:
    with SessionLocal() as db:
        symbols = (
            db.execute(select(models.Symbol.symbol).where(models.Symbol.enabled.is_(True)))
            .scalars()
            .all()
        )

    now = datetime.now(timezone.utc).isoformat()
    logger.info("tick: loaded %d symbols (sample=%s)", len(symbols), symbols[:10])

    # --- TEST: call Massive snapshot for a small subset first ---
    svc = MassiveDataService(api_key=settings.polygon_api_key)

    test_symbols = symbols[:50]  # start small; increase once confirmed working
    t0 = datetime.now(timezone.utc)
    snap = svc.get_market_snapshot(test_symbols)
    dt_ms = int((datetime.now(timezone.utc) - t0).total_seconds() * 1000)
    sample = snap[:3]
    logger.info("massive snapshot: got %d rows in %dms (sample=%s)", len(snap), dt_ms, sample)

    publish_event(
        {
            "at": now,
            "symbol_count": len(symbols),
            "tested_symbol_count": len(test_symbols),
            "snapshot_row_count": len(snap),
            "snapshot_sample": sample,
            "snapshot_ms": dt_ms,
        },
    )

    return {
        "ok": True,
        "at": now,
        "symbol_count": len(symbols),
        "tested_symbol_count": len(test_symbols),
        "snapshot_row_count": len(snap),
        "snapshot_ms": dt_ms,
    }


