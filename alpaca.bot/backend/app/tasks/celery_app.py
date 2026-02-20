from celery import Celery
from app.core.config import settings
import os
import platform

    

celery = Celery(
    "alpacabot",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

if platform.system() == "Windows":
    celery.conf.worker_pool = "solo"
    celery.conf._concurrency = 1

celery.conf.timezone = "UTC"
celery.conf.beat_schedule = {
    "tick-every-10s": {
        "task": "app.tasks.runner.tick",
        "schedule": 60.0,
    }
}
