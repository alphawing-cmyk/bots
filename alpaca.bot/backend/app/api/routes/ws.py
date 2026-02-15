import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as redis_async

from app.core.config import settings
from app.core.events import EVENT_CHANNEL

router = APIRouter(tags=["ws"])

@router.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()

    r = redis_async.Redis.from_url(settings.celery_broker_url, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe(EVENT_CHANNEL)

    try:
        # Send a hello so client knows we're connected
        await ws.send_json({"type": "hello", "channel": EVENT_CHANNEL})

        while True:
            msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if msg and msg.get("type") == "message":
                data = msg.get("data")
                try:
                    payload = json.loads(data)
                except Exception:
                    payload = {"type": "raw", "data": data}
                await ws.send_json(payload)

            # keep loop cooperative
            await asyncio.sleep(0.05)

    except WebSocketDisconnect:
        pass
    finally:
        try:
            await pubsub.unsubscribe(EVENT_CHANNEL)
            await pubsub.close()
        except Exception:
            pass
        try:
            await r.close()
        except Exception:
            pass
