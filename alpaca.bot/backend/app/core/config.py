from pydantic import BaseModel
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    alpaca_api_key: str
    alpaca_api_secret: str
    alpaca_base_url: str = "https://paper-api.alpaca.markets"

    database_url: str
    celery_broker_url: str
    celery_result_backend: str

    app_env: str = "dev"

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
