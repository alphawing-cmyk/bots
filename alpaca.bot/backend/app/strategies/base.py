from __future__ import annotations
from dataclasses import dataclass
from typing import Protocol, Any

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

class Strategy(Protocol):
    key: str
    name: str

    def run(self, *, symbols: list[str], params: dict[str, Any]) -> list[Signal]:
        ...
