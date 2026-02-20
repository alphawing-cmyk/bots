from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, date
from typing import Any, Dict, Iterable, List, Optional, Tuple, Union, Sequence
from massive import RESTClient
import requests
import time
import random
from concurrent.futures import ThreadPoolExecutor, as_completed

# Types
DateLike = Union[str, datetime, date]



@dataclass
class AggBar:
    t: int
    o: float
    h: float
    l: float
    c: float
    v: float
    vw: float | None = None
    n: int | None = None


class MassiveDataService:
    """
    Wrapper around massive-com/client-python (RESTClient) that also exposes
    the market-wide endpoints that scale to 1000+ symbols.

    Key idea:
      - For DAILY OHLC across lots of symbols, use Grouped Daily:
        GET /v2/aggs/grouped/locale/us/market/stocks/{date}
      - For "latest" minute/day/prevDay across lots of symbols, use Full Market Snapshot:
        GET /v2/snapshot/locale/us/markets/stocks/tickers
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url="https://api.massive.com",
        timeout: int = 30,
        max_retries: int = 6,
        backoff_base_s: float = 0.6,
        backoff_jitter_s: float = 0.25,
    ):
        self.client = RESTClient(api_key=api_key)
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.backoff_base_s = backoff_base_s
        self.backoff_jitter_s = backoff_jitter_s

        self._http = requests.Session()
        self._http.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        })
    
    def _request_json(
        self,
        path: str,
        params: Optional[dict[str, Any]] = None
    )-> dict[str, Any]:
        
        url = f"{self.base_url}{path}"
        params = params or {}


        for attempt in range(self.max_retries + 1):
            resp = self._http.get(url, params=params, timeout=self.timeout)

            # Success
            if 200 <= resp.status_code < 300:
                return resp.json()
            
            # Rate limited: respect Retry-After when present, else exponential backoff
            if resp.status_code == 429:
                retry_after = resp.headers.get("Retry-After")
                if retry_after is not None:
                    sleep_s = float(retry_after)
                else:
                    sleep_s = (self.backoff_base_s * (2 ** attempt)) + random.uniform(
                        0, self.backoff_jitter_s
                    )
                time.sleep(sleep_s)
                continue

            # Transient server errors: backoff
            if resp.status_code in (500, 502, 503, 504):
                sleep_s = (self.backoff_base_s * (2 ** attempt)) + random.uniform(0, self.backoff_jitter_s)
                time.sleep(sleep_s)
                continue

            # Non-retryable
            try:
                payload = resp.json()
            except Exception:
                payload = resp.text
            raise RuntimeError(f"HTTP {resp.status_code} for {url}: {payload}")

        raise RuntimeError(f"Exceeded retries for {url}")
    

    # -----------------------
    # Per-ticker historical bars (uses RESTClient.list_aggs)
    # -----------------------
    def get_ohlc(
        self,
        symbol: str,
        *,
        multiplier: int = 1,
        timespan: str = "day",
        from_: str,
        to: str,
        limit: int = 50000,
    ) -> list[AggBar]:
        """
        Historical aggregates for ONE symbol via RESTClient.list_aggs(generator)
        """

        out: List[AggBar] = []

        for a in self.client.list_aggs(
            ticker=symbol,
            multiplier=multiplier,
            timespan=timespan,
            from_=from_,
            to=to,
            limit=limit,
        ):
            
            out.append(
                AggBar(
                    t=getattr(a, "timestamp", getattr(a, "t", None)),
                    o=getattr(a, "open", getattr(a, "o", None)),
                    h=getattr(a, "high", getattr(a, "h", None)),
                    l=getattr(a, "low", getattr(a, "l", None)),
                    c=getattr(a, "close", getattr(a, "c", None)),
                    v=getattr(a, "volume", getattr(a, "v", None)),
                    vw=getattr(a, "vwap", getattr(a, "vw", None)),
                    n=getattr(a, "transactions", getattr(a, "n", None)),
                )
            )
        return out
    
    def get_ohlc_many(
            self,
            symbols: Sequence[str],
            *,
            multiplier: int = 1,
            timespan: str = "day",
            from_: str,
            to: str,
            limit: int = 50000,
            max_workers: int = 12,
        ) -> dict[str, list[AggBar]]:

        """
        Historical aggregates for MANY symbols.
        WARNING: For 1000 symbols this can be very expensive in calls/time.
        Prefer get_daily_market_summary()+filter for daily bars.
        """
        results: dict[str, list[AggBar]] = {}

        def _one(sym: str) -> tuple[str, list[AggBar]]:
            return sym, self.get_ohlc(
                sym, multiplier=multiplier, timespan=timespan, from_=from_, to=to, limit=limit
            )

        with ThreadPoolExecutor(max_workers=max_workers) as ex:
            futures = [ex.submit(_one, s) for s in symbols]
            for f in as_completed(futures):
                sym, bars = f.result()
                results[sym] = bars

        return results
    
    # -----------------------
    # High-scale endpoints (good for 1000+ symbols)
    # -----------------------
    def get_daily_market_summary(
        self,
        date_yyyy_mm_dd: str,
        *,
        adjusted: bool = True,
        include_otc: bool = False,
    ) -> list[dict[str, Any]]:
        """
        Daily OHLC for ALL US stocks for a trading date (one call).
        Endpoint: GET /v2/aggs/grouped/locale/us/market/stocks/{date}
        """
        payload = self._request_json(
            f"/v2/aggs/grouped/locale/us/market/stocks/{date_yyyy_mm_dd}",
            params={"adjusted": str(adjusted).lower(), "include_otc": str(include_otc).lower()},
        )
        return payload.get("results", [])
    
    def get_daily_market_summary_for_symbols(
        self,
        date_yyyy_mm_dd: str,
        symbols: Sequence[str],
        *,
        adjusted: bool = True,
        include_otc: bool = False,
    ) -> list[dict[str, Any]]:
        """
        Same as get_daily_market_summary, but filters to your symbol list locally.
        Great for ~1000 tickers.
        """
        wanted = set(symbols)
        rows = self.get_daily_market_summary(
            date_yyyy_mm_dd, adjusted=adjusted, include_otc=include_otc
        )
        # In grouped daily results, the ticker is typically under key "T" (Polygon style) or "ticker".
        # We'll support both safely.
        out = []
        for r in rows:
            tkr = r.get("T") or r.get("ticker")
            if tkr in wanted:
                out.append(r)
        return out
    
    def get_market_snapshot(
        self,
        symbols: Optional[Sequence[str]] = None,
        *,
        include_otc: bool = False,
        chunk_max_chars: int = 1800,
    ) -> list[dict[str, Any]]:
        """
        Full Market Snapshot (minute/day/prevDay + last trade/quote depending on plan).
        Endpoint: GET /v2/snapshot/locale/us/markets/stocks/tickers

        The API supports a comma-separated 'tickers' list. For ~1000 symbols, we chunk to avoid URL length issues.
        """
        if not symbols:
            payload = self._request_json(
                "/v2/snapshot/locale/us/markets/stocks/tickers",
                params={"include_otc": str(include_otc).lower()},
            )
            return payload.get("tickers", [])

        # Chunk by URL-safe character count
        chunks: list[list[str]] = []
        cur: list[str] = []
        cur_len = 0
        for s in symbols:
            add_len = len(s) + (1 if cur else 0)
            if cur and (cur_len + add_len) > chunk_max_chars:
                chunks.append(cur)
                cur = [s]
                cur_len = len(s)
            else:
                cur.append(s)
                cur_len += add_len
        if cur:
            chunks.append(cur)

        all_rows: list[dict[str, Any]] = []
        for ch in chunks:
            payload = self._request_json(
                "/v2/snapshot/locale/us/markets/stocks/tickers",
                params={
                    "tickers": ",".join(ch),
                    "include_otc": str(include_otc).lower(),
                },
            )
            all_rows.extend(payload.get("tickers", []))
        return all_rows

    # -----------------------
    # Optional DataFrame helpers (if you use pandas)
    # -----------------------
    def get_ohlc_many_df(self, *args, **kwargs):
        import pandas as pd  # type: ignore

        data = self.get_ohlc_many(*args, **kwargs)
        rows = []
        for sym, bars in data.items():
            for b in bars:
                rows.append(
                    {
                        "symbol": sym,
                        "t": b.t,
                        "open": b.o,
                        "high": b.h,
                        "low": b.l,
                        "close": b.c,
                        "volume": b.v,
                        "vwap": b.vw,
                        "transactions": b.n,
                    }
                )
        return pd.DataFrame(rows)

    def get_daily_market_summary_for_symbols_df(self, date_yyyy_mm_dd: str, symbols: Sequence[str], **kwargs):
        import pandas as pd  # type: ignore

        rows = self.get_daily_market_summary_for_symbols(date_yyyy_mm_dd, symbols, **kwargs)
        return pd.DataFrame(rows)

