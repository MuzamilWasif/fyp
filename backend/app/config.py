from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./vigilanteye.db"
    SECRET_KEY: str = "dev-secret-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EVIDENCE_DIR: str = "./evidence_store"

    @field_validator("*", mode="before")
    @classmethod
    def empty_string_means_default(cls, v, info):
        """Hosting dashboards often set unused variables to empty strings;
        treat '' as 'not set' and fall back to the field default."""
        if v == "":
            return cls.model_fields[info.field_name].default
        return v

    class Config:
        env_file = ".env"


settings = Settings()
