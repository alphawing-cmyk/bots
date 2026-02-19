import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Integer, JSON, Text, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class StrategyConfig(Base):
    __tablename__ = "strategy_configs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    type: Mapped[str] = mapped_column(String(120))  # registry key, e.g. "sma_cross"
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    interval_seconds: Mapped[int] = mapped_column(Integer, default=60)
    symbols: Mapped[list] = mapped_column(JSON, default=list)          # e.g. ["AAPL","MSFT"]
    params: Mapped[dict] = mapped_column(JSON, default=dict)           # strategy-specific
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    runs: Mapped[list["StrategyRun"]] = relationship(back_populates="strategy", cascade="all, delete-orphan")

class StrategyRun(Base):
    __tablename__ = "strategy_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    strategy_id: Mapped[str] = mapped_column(String, ForeignKey("strategy_configs.id"), index=True)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    status: Mapped[str] = mapped_column(String(32), default="running")  # running|ok|error
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    signals: Mapped[dict] = mapped_column(JSON, default=dict)
    orders: Mapped[list] = mapped_column(JSON, default=list)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)

    strategy: Mapped["StrategyConfig"] = relationship(back_populates="runs")

class BotSetting(Base):
    __tablename__ = "bot_settings"

    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Symbol(Base):
    __tablename__ = "symbols"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # Ticker, e.g. "AAPL"
    symbol: Mapped[str] = mapped_column(String(32), unique=True, index=True)

    # Optional metadata for UI / filtering
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    exchange: Mapped[str | None] = mapped_column(String(64), nullable=True)
    asset_class: Mapped[str | None] = mapped_column(String(64), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # Freeform JSON (sector, tags, alpaca asset fields, etc.)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )