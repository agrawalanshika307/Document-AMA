from app.llm.gemini import llm, embeddings, vector_store
from app.config import settings


async def process_query(query: str):
    try:
        
        results = vector_store.similarity_search_with_score(
            query=query,
            k=10
        )
        context = ""

        for doc, score in results:
            context += doc.page_content + "\n\n"
        
        prompt = f"""
        Answer the user's question ONLY using the following context.

        Context:
        {context}

        Question:
        {query}
        """
        response = await llm.ainvoke(prompt)
        return response.content
    except Exception as e:
        return f"Error processing query: {str(e)}"