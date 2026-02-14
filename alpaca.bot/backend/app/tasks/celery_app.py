from celery import Celery
from app.core.config import settings

celery = Celery(
    "alpacabot",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery.conf.timezone = "UTC"
celery.conf.beat_schedule = {
    "tick-every-10s": {
        "task": "app.tasks.runner.tick",
        "schedule": 10.0,
    }
}
