### Run the code
- ` python -m uvicorn app.main:app --port 8001  --reload`

### Celery Commands
- `celery -A app.tasks.celery_app.celery worker -l info`
- `celery -A app.tasks.celery_app.celery beat -l info`