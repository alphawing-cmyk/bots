import json
from typing import Any
import redis
from app.core.config import settings

EVENT_CHANNEL = "bot_events"

def publish_event(event: dict[str, Any]) -> None:
    """
    Publish an event to Redis pubsub so the FastAPI websocket can forward it to clients.
    """
    r = redis.Redis.from_url(settings.celery_broker_url, decode_responses=True)
    r.publish(EVENT_CHANNEL, json.dumps(event, default=str))
