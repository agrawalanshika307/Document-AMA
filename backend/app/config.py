from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

##GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

class Settings(BaseModel):
    APP_NAME: str = "Query Service"
    VERSION: str = "1.0.0"
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY")

settings = Settings()