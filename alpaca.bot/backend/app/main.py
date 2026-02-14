from fastapi import FastAPI
from app.db.models import Base
from app.db.session import engine
from app.api.routes import health, strategies, runs, metrics, settings, ws

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Alpaca Bot API")

app.include_router(health.router, prefix="/api")
app.include_router(strategies.router, prefix="/api")
app.include_router(runs.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(ws.router, prefix="/api")
