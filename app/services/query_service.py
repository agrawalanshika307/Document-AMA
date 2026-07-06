from app.llm.gemini import llm


async def process_query(query: str):
    try:
        response = await llm.ainvoke(query)
        return response.content
    except Exception as e:
        return f"Error processing query: {str(e)}"