from pydantic import BaseModel

class QueryResponse(BaseModel):
    status_code: int
    text: str