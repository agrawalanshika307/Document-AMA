from fastapi import APIRouter, Query
from app.schemas.response import QueryResponse
from app.services.query_service import process_query

router = APIRouter()


@router.get(
    "/user_query",
    response_model=QueryResponse,
    summary="User Query Endpoint"
)
async def user_query(query: str = Query(..., description="User query")):

    response = await process_query(query)

    return QueryResponse(
        status_code=200,
        text=response
    )