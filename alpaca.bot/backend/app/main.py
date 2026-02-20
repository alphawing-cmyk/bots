from fastapi import FastAPI
from app.db.models import Base
from app.db.session import engine
from app.api.routes import (
    health, 
    strategies, 
    runs, 
    metrics, 
    settings as settingsRoutes, 
    ws,
    symbols,
)
from fastapi.middleware.cors import CORSMiddleware
import logging
import sys

Base.metadata.create_all(bind=engine)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s:%(levelname)s:%(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

app = FastAPI(title="Alpaca Bot API")

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(health.router, prefix="/api")
app.include_router(strategies.router, prefix="/api")
app.include_router(runs.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(settingsRoutes.router, prefix="/api")
app.include_router(ws.router, prefix="/api")
app.include_router(symbols.router, prefix="/api")
