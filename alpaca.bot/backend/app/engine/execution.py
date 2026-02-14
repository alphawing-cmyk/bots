from __future__ import annotations
from typing import Any
from app.engine.alpaca_client import get_trading_client, place_market_order
from app.engine.risk import RiskLimits, validate_signal

def execute_signals(signals, *, risk: RiskLimits) -> list[dict[str, Any]]:
    client = get_trading_client()
    orders: list[dict[str, Any]] = []

    for i, s in enumerate(signals):
        if i >= risk.max_orders_per_run:
            break
        validate_signal(s, risk)

        o = place_market_order(client, s.symbol, s.side, s.qty)
        orders.append({
            "id": str(o.id),
            "symbol": s.symbol,
            "side": s.side,
            "qty": s.qty,
            "reason": s.reason,
        })

    return orders
