from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, Optional, List
import pandas as pd
import numpy as np
from app.db.models import StrategyRun
from app.core.events import publish_event
from app.strategies.base import StrategyBase



class SmaCrossOverStrategy(StrategyBase):
    """
    Simple SMA crossover strategy.

    Params (self.params) supported:
      - fast: int (default 10)
      - slow: int (default 50)
      - qty: float (default 1)
      - take_profit_pct: float | None (default None)
      - stop_loss_pct: float | None (default None)
      - min_bars: int (default slow + 5)
    """

    TYPE = "cross_over"
    display_name = "Crossover System"

    # ---- Public entry point (call this from your scheduler/runner) ----
    def generate_signals(self, market: "MarketContext") -> List["Signal"]:
        if not self.is_enabled():
            return []

        fast = int(self.params.get("fast", 10))
        slow = int(self.params.get("slow", 50))
        qty = float(self.params.get("qty", 1))
        take_profit_pct = self.params.get("take_profit_pct", None)
        stop_loss_pct = self.params.get("stop_loss_pct", None)
        min_bars = int(self.params.get("min_bars", slow + 5))

        symbols = self._symbols_list()
        if not symbols:
            return []

        signals: List[Signal] = []

        for sym in symbols:
            df = self._get_bars_df(sym, limit=max(min_bars, slow + 5))
            if df is None or df.empty:
                continue

            sig = self._crossover_signal_from_df(
                symbol=sym,
                df=df,
                fast=fast,
                slow=slow,
                qty=qty,
                take_profit_pct=take_profit_pct,
                stop_loss_pct=stop_loss_pct,
            )
            if sig:
                signals.append(sig)

        # optional: publish what you found
        if signals:
            publish_event(
                self.ctx.event_channel,
                {"type": "signals_generated", "strategy_id": self.strategy_id, "signals": [s.__dict__ for s in signals]},
            )

        return signals

    # ---- Internals ----
    def _symbols_list(self) -> List[str]:
        # ctx.symbols could be dict or list; your context shows dict
        s = self.ctx.symbols
        if s is None:
            return []
        if isinstance(s, dict):
            # assume {"AAPL": {...}} or {"symbols": ["AAPL", ...]}
            if "symbols" in s and isinstance(s["symbols"], list):
                return [str(x).upper() for x in s["symbols"]]
            return [str(k).upper() for k in s.keys()]
        if isinstance(s, list):
            return [str(x).upper() for x in s]
        return []

    def _get_bars_df(self, symbol: str, limit: int = 200) -> Optional[pd.DataFrame]:
        """
        Adapt this to your broker client.

        Expected output columns:
          - timestamp (optional but nice)
          - open, high, low, close, volume (close is required)
        """
        client = self.ctx.broker_client

        # ---- YOU ADAPT THIS CALL ----
        # It should return a list[dict] or DataFrame-like of OHLCV bars.
        # Example bar dict: {"t": "...", "o":1, "h":2, "l":0.5, "c":1.5, "v":123}
        bars = client.get_bars(symbol=symbol, limit=limit)  # <-- implement on your client

        if bars is None:
            return None

        df = pd.DataFrame(bars)

        # Normalize common field names
        rename_map = {
            "t": "timestamp",
            "time": "timestamp",
            "datetime": "timestamp",
            "o": "open",
            "h": "high",
            "l": "low",
            "c": "close",
            "v": "volume",
        }
        df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

        if "close" not in df.columns:
            return None

        # Sort by time if present
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
            df = df.sort_values("timestamp")

        # Ensure numeric close
        df["close"] = pd.to_numeric(df["close"], errors="coerce")
        df = df.dropna(subset=["close"])

        return df

    def _crossover_signal_from_df(
        self,
        symbol: str,
        df: pd.DataFrame,
        fast: int,
        slow: int,
        qty: float,
        take_profit_pct: float | None,
        stop_loss_pct: float | None,
    ) -> Optional["Signal"]:
        if len(df) < max(fast, slow) + 2:
            return None

        close = df["close"].to_numpy(dtype=float)

        # SMAs with pandas (simple & reliable)
        s = pd.Series(close)
        fast_sma = s.rolling(fast).mean().to_numpy()
        slow_sma = s.rolling(slow).mean().to_numpy()

        # We only need the last 2 points to detect a cross
        # Cross up: fast goes from <= slow to > slow
        # Cross down: fast goes from >= slow to < slow
        f_prev, f_now = fast_sma[-2], fast_sma[-1]
        sl_prev, sl_now = slow_sma[-2], slow_sma[-1]

        # If either is nan, no signal
        if np.isnan([f_prev, f_now, sl_prev, sl_now]).any():
            return None

        crossed_up = (f_prev <= sl_prev) and (f_now > sl_now)
        crossed_down = (f_prev >= sl_prev) and (f_now < sl_now)

        if crossed_up:
            return Signal(
                symbol=symbol,
                side="buy",
                qty=qty,
                reason=f"SMA crossover UP (fast={fast}, slow={slow})",
                take_profit_pct=take_profit_pct,
                stop_loss_pct=stop_loss_pct,
            )

        if crossed_down:
            return Signal(
                symbol=symbol,
                side="sell",
                qty=qty,
                reason=f"SMA crossover DOWN (fast={fast}, slow={slow})",
                take_profit_pct=take_profit_pct,
                stop_loss_pct=stop_loss_pct,
            )

        return None
