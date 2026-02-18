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



from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional, Dict, Callable

from sqlalchemy.orm import Session
import json

from app.db.models import StrategyConfig, StrategyRun
from app.core.events import publish_event


### Helpers
def utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class StrategyContext:
    db_session_factory: Callable[[], Any]  # should return a context manager yielding Session
    id: str
    name: str
    type: str
    enabled: bool
    interval_seconds: int
    symbols: dict
    broker_client: Any
    event_channel: str
    params: Dict[str, Any] = field(default_factory=dict)


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
        self.params = dict(ctx.params or {})  # local copy
        self.db_row = self.load_from_db()

    # -------------------- DB config loading --------------------

    def load_from_db(self) -> Optional[StrategyConfig]:
        with self.ctx.db_session_factory() as db:  # expects context manager yielding Session
            row = (
                db.query(StrategyConfig)
                .filter(StrategyConfig.id == self.strategy_id)
                .one_or_none()
            )

            self.db_row = row
            if row:
                self.params = self._parse_params(getattr(row, "params_json", None))
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
        return bool(self.db_row and getattr(self.db_row, "enabled", False))

    def interval_seconds_value(self) -> int:
        """
        Renamed slightly to avoid clashing with ctx.interval_seconds attribute name.
        (You can keep the old name if you prefer, but this avoids confusion.)
        """
        if not self.db_row:
            return 60
        try:
            n = int(getattr(self.db_row, "interval_seconds", None) or 60)
            return max(1, n)
        except Exception:
            return 60






