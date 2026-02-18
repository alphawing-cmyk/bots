from __future__ import annotations
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db.session import get_db
from app.db import models

router = APIRouter(tags=["settings"])


# ---- Pydantic schemas ----

class SettingOut(BaseModel):
    key: str
    value: dict = Field(default_factory=dict)
    updated_at: datetime | None = None


class SettingUpsertIn(BaseModel):
    value: dict = Field(default_factory=dict)


class SettingsBulkUpsertIn(BaseModel):
    items: dict[str, dict] = Field(default_factory=dict)


# ---- Routes ----

@router.get("/settings", response_model=list[SettingOut])
def list_settings(db: Session = Depends(get_db)):
    items = list(db.execute(select(models.BotSetting)).scalars())
    return [
        SettingOut(key=i.key, value=i.value or {}, updated_at=i.updated_at)
        for i in items
    ]


@router.get("/settings/{key}", response_model=SettingOut)
def get_setting(key: str, db: Session = Depends(get_db)):
    s = db.get(models.BotSetting, key)
    if not s:
        raise HTTPException(status_code=404, detail="Setting not found")
    return SettingOut(key=s.key, value=s.value or {}, updated_at=s.updated_at)


@router.put("/settings/{key}", response_model=SettingOut)
def upsert_setting(key: str, payload: SettingUpsertIn, db: Session = Depends(get_db)):
    s = db.get(models.BotSetting, key)
    now = datetime.utcnow()

    if s is None:
        s = models.BotSetting(key=key, value=payload.value or {}, updated_at=now)
        db.add(s)
    else:
        s.value = payload.value or {}
        s.updated_at = now

    db.commit()
    db.refresh(s)
    return SettingOut(key=s.key, value=s.value or {}, updated_at=s.updated_at)


@router.patch("/settings/{key}", response_model=SettingOut)
def patch_setting(key: str, payload: SettingUpsertIn, db: Session = Depends(get_db)):
    """
    Merge patch (shallow) into existing setting value.
    """
    s = db.get(models.BotSetting, key)
    now = datetime.utcnow()

    if s is None:
        s = models.BotSetting(key=key, value=payload.value or {}, updated_at=now)
        db.add(s)
        db.commit()
        db.refresh(s)
        return SettingOut(key=s.key, value=s.value or {}, updated_at=s.updated_at)

    if not isinstance(s.value, dict):
        s.value = {}

    # shallow merge
    for k, v in (payload.value or {}).items():
        s.value[k] = v

    s.updated_at = now
    db.commit()
    db.refresh(s)
    return SettingOut(key=s.key, value=s.value or {}, updated_at=s.updated_at)


@router.post("/settings/bulk", response_model=list[SettingOut])
def bulk_upsert(payload: SettingsBulkUpsertIn, db: Session = Depends(get_db)):
    """
    Upsert multiple settings keys at once.
    Body:
      { "items": { "risk": {...}, "trading": {...} } }
    """
    out: list[SettingOut] = []
    now = datetime.utcnow()

    for key, value in (payload.items or {}).items():
        s = db.get(models.BotSetting, key)
        if s is None:
            s = models.BotSetting(key=key, value=value or {}, updated_at=now)
            db.add(s)
        else:
            s.value = value or {}
            s.updated_at = now
        out.append(SettingOut(key=key, value=value or {}, updated_at=now))

    db.commit()
    return out


@router.delete("/settings/{key}")
def delete_setting(key: str, db: Session = Depends(get_db)):
    s = db.get(models.BotSetting, key)
    if not s:
        raise HTTPException(status_code=404, detail="Setting not found")

    db.delete(s)
    db.commit()
    return {"ok": True}
