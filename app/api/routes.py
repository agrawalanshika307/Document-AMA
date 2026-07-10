from sys import exception
import fitz
from fastapi import APIRouter, Query, Request, HTTPException
from app.schemas.response import QueryResponse
from app.services.query_service import process_query
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter 
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.config import settings
from langchain_chroma import Chroma
router = APIRouter()


@router.get("/user_query", response_model=QueryResponse, summary="User Query Endpoint")

async def user_query(query: str = Query(..., description="User query")):

    response = await process_query(query)

    return QueryResponse(
        status_code=200,
        text=response
    )
@router.post("/upload_document")
async def upload_document(request: Request):

    # Read the raw PDF bytes
    try:
        pdf_bytes = await request.body()
        #print(f"PDF bytes received: {pdf_bytes}")
        #print(f"request bytes received: {await request.body()}")
    # Check if a file was sent
        if not pdf_bytes:
            raise HTTPException(
                status_code=400,
                detail="Empty PDF received."
            )
        pdf_document = fitz.open(
        stream=pdf_bytes,
        filetype="pdf"
        )
        
        documents = []

        for page_number, page in enumerate(pdf_document, start=1):

            document = Document(
            page_content=page.get_text("text"),
            metadata={
            "source": "uploaded_pdf",
            "page": page_number
            }
            )

            documents.append(document)
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = text_splitter.split_documents(documents)
        # print(f"Number of chunks created: {len(chunks)}")
        # print(f"First chunk content: {chunks[0].page_content[:500]}")  # Print first 500 characters of the first chunk
        # print(f"First chunk: {chunks[0]}")
        # print(f"Second chunk: {chunks[1]}")
        # print(f"Third chunk: {chunks[2]}")

        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-2",
            google_api_key=settings.GOOGLE_API_KEY
        )
           
        vector_store = Chroma(
            collection_name="knowledge_base",
            embedding_function=embeddings,
            persist_directory="./chroma_db"
        )
        vector_store.add_documents(chunks)
        print("Documents added to vector store successfully.")
        #print(f"collection: {vector_store.get_collection('knowledge_base')}")
        collection = vector_store._collection

        results = collection.get(
        include=["embeddings"]
        )

        # print(results)
        return {"message": "PDF uploaded and processed successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing PDF: {str(e)}"
        )
    
