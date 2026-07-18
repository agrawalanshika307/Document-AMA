from fastapi import FastAPI

from backend.app.api.routes import router
from backend.app.config import settings

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