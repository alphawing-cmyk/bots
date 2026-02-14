from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime
from app.db import models

def upsert_setting(db: Session, key: str, value: dict) -> models.BotSetting:
    obj = db.get(models.BotSetting, key)
    if obj is None:
        obj = models.BotSetting(key=key, value=value)
        db.add(obj)
    else:
        obj.value = value
        obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj

def list_enabled_strategies(db: Session) -> list[models.StrategyConfig]:
    return list(db.execute(select(models.StrategyConfig).where(models.StrategyConfig.enabled == True)).scalars())
