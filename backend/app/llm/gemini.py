from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0.2
)

embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-2",
            google_api_key=settings.GOOGLE_API_KEY
        )

vector_store = Chroma(
            collection_name="knowledge_base",
            embedding_function=embeddings,
            persist_directory="./chroma_db"
        )