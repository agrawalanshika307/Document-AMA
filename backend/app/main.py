from fastapi import FastAPI

from app.api.routes import router
from app.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
)

app.include_router(router)


@app.get("/")
async def root():
    return {
        "status": "running",
        "service": settings.APP_NAME
    }