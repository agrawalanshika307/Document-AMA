from app.llm.gemini import llm
from app.config import settings
from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings

async def process_query(query: str):
    try:
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-2",
            google_api_key=settings.GOOGLE_API_KEY
        )
        vector_store = Chroma(
            collection_name="knowledge_base",
            embedding_function=embeddings,
            persist_directory="./chroma_db"
        )
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