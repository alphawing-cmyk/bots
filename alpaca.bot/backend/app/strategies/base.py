from __future__ import annotations
from dataclasses import dataclass
from typing import Protocol, Any
from app.db.models import StrategyConfig, StrategyRun
from app.core.events import publish_event
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from sqlalchemy.orm import Session
import json



### Helpers
def utcnow() -> datetime:
    return datetime.now(timezone.utc)



@dataclass
class StrategyContext:
    db_session_factory: callable
    id: str
    name: str
    type: str
    enabled: bool
    interval_seconds: int
    symbols: dict
    params: Optional[dict] = {}
    broker_client: Any
    event_channel:str


@dataclass
class MarketContext:
    now_iso: str

@dataclass
class Signal:
    symbol: str
    side: str            # "buy" or "sell"
    qty: float
    reason: str
    take_profit_pct: float | None = None
    stop_loss_pct: float | None = None



class StrategyBase:
    """
        Base class for all strategies.

        Each strategy class must define:
        - TYPE: unique string, e.g. "ema_crossover"
        - display_name: optional human friendly name

        DB row in strategies table must have `type == TYPE`.
    """

    TYPE: str = "base"
    display_name: str = "Base Strategy"

    def __init__(self, ctx: StrategyContext):
        self.strategy_id = ctx.id
        self.ctx = ctx
        self.params= ctx.params
        self.db_row = self.load_from_db()
    
      # -------------------- DB config loading --------------------

    def load_from_db(self, db: Session) -> StrategyConfig:
        row = db.query(StrategyConfig).filter(StrategyConfig.id == self.strategy_id).one()
        self.db_row = row
        self.params = self._parse_params(row.params_json)
        return row
    
    def _parse_params(self, params_json: str | None) -> Dict[str, Any]:
        if not params_json:
            return {}
        try:
            v = json.loads(params_json)
            return v if isinstance(v, dict) else {}
        except Exception:
            return {}
        
    # -------------------- Scheduling logic --------------------
    def is_enabled(self) -> bool:
        return bool(self.db_row and self.db_row.enabled)

    def interval_seconds(self) -> int:
        if not self.db_row:
            return 60
        try:
            n = int(self.db_row.interval_seconds or 60)
            return max(1, n)
        

        except Exception as e:
            with self.ctx.db_session_factory() as db:
                run = db.query(Run).filter(Run.id == run_id).one()
                run.finished_at = utcnow()
                run.status = "error"
                run.message = str(e)
                db.add(run)
                db.commit()

                publish_event(
                    self.ctx.event_channel,
                    {
                        "type": "run_error",
                        "run": run.to_dict() if hasattr(run, "to_dict") else {
                            "id": run.id,
                            "strategy_id": run.strategy_id,
                            "started_at": run.started_at.isoformat(),
                            "finished_at": run.finished_at.isoformat() if run.finished_at else None,
                            "status": run.status,
                            "message": run.message,
                        },
                    },
                )
        raise
            





