from __future__ import annotations
from typing import Any
from app.strategies.base import Signal

class SMACrossStrategy:
    key = "sma_cross"
    name = "SMA Cross"

    def __init__(self, market_data):
        self.market_data = market_data

    def run(self, *, symbols: list[str], params: dict[str, Any]) -> list[Signal]:
        fast = int(params.get("fast", 10))
        slow = int(params.get("slow", 30))
        qty  = float(params.get("qty", 1))

        out: list[Signal] = []
        for sym in symbols:
            closes = self.market_data.get_recent_closes(sym, limit=max(slow, 60))
            if len(closes) < slow:
                continue

            fast_sma = sum(closes[-fast:]) / fast
            slow_sma = sum(closes[-slow:]) / slow

            # naive cross check: compare current smas only (upgrade later with prev values)
            if fast_sma > slow_sma:
                out.append(Signal(symbol=sym, side="buy", qty=qty, reason=f"fast({fast})>slow({slow})",
                                  stop_loss_pct=float(params.get("stop_loss_pct", 0.01)),
                                  take_profit_pct=float(params.get("take_profit_pct", 0.02))))
            elif fast_sma < slow_sma:
                out.append(Signal(symbol=sym, side="sell", qty=qty, reason=f"fast({fast})<slow({slow})"))

        return out
