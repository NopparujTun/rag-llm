import os
import logging
import io
from typing import List, Optional

import PyPDF2
import httpx
from fastapi import FastAPI, UploadFile, File, Form
from pydantic import BaseModel, Field, ValidationError
from dotenv import load_dotenv

from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
from fastapi.middleware.cors import CORSMiddleware
import json_repair  # Far more robust than regex

# -------------------- Logging --------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# -------------------- Setup --------------------
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# -------------------- Pydantic Output Models --------------------
# These enforce the exact structure we expect from the LLM
class FlashcardModel(BaseModel):
    question: str
    answer: str
    skills: List[str]

class LLMResponseModel(BaseModel):
    skills: List[str]
    flashcards: List[FlashcardModel] = Field(default_factory=list)

# -------------------- LLM Service --------------------
class LLMService:
    def __init__(self):
        self.groq_url = "https://api.groq.com/openai/v1/chat/completions"
        self.openrouter_url = "https://openrouter.ai/api/v1/chat/completions"

    async def call_groq(self, prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        data = {
            "model": "llama3-8b-8192",
            "messages": [
                {"role": "system", "content": "You are an expert technical interviewer."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2, # Lowered temperature for more deterministic JSON
            "max_tokens": 1500, # Increased to prevent truncation
            "response_format": {"type": "json_object"} # 🔥 CRITICAL: Enforces JSON output
        }

        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post(self.groq_url, headers=headers, json=data)

        if res.status_code != 200:
            raise Exception(res.text)

        return res.json()["choices"][0]["message"]["content"]

    async def call_openrouter(self, prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "prepdeck"
        }

        data = {
            "model": "meta-llama/llama-3-8b-instruct",
            "messages": [
                {"role": "system", "content": "You are an expert technical interviewer."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 1500
        }

        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post(self.openrouter_url, headers=headers, json=data)

        if res.status_code != 200:
            raise Exception(res.text)

        return res.json()["choices"][0]["message"]["content"]

    async def generate(self, prompt: str) -> str:
        try:
            return await self.call_groq(prompt)
        except Exception as e:
            logger.warning(f"Groq failed → fallback OpenRouter: {e}")
            return await self.call_openrouter(prompt)

llm = LLMService()

# -------------------- Prompt --------------------
def build_prompt(context: str, text: str) -> str:
    # Uses XML tags and a strict example to guide open-weight models
    return f"""You are an expert technical interviewer.

    <task>
    Extract backend skills from the INPUT and generate interview flashcards based ONLY on those skills.
    </task>

    <rules>
    1. You MUST return ONLY a valid JSON object.
    2. DO NOT wrap the JSON in markdown blocks. No explanations.
    3. Skills MUST be extracted directly from the INPUT.
    4. Focus ONLY on backend engineering topics.
    5. Use the CONTEXT to inspire your questions. If the CONTEXT is empty or irrelevant, use your own expert knowledge to generate the 5 flashcards.
    </rules>

    <schema>
    {{
    "skills": ["skill1", "skill2"],
    "flashcards": [
        {{
        "question": "Clear question",
        "answer": "Detailed answer",
        "skills": ["skill1"]
        }}
    ]
    }}
    </schema>

    <example>
    {{
    "skills": ["FastAPI", "PostgreSQL"],
    "flashcards": [
        {{
        "question": "How does FastAPI handle dependency injection?",
        "answer": "FastAPI uses the Depends() class to declare dependencies...",
        "skills": ["FastAPI"]
        }}
    ]
    }}
    </example>

    INPUT:
    {text}

    CONTEXT (Reference Only):
    {context}
    """

# -------------------- Core Logic --------------------
def search_similar_questions(text: str):
    vector = embedding_model.encode(text).tolist()

    response = supabase.rpc(
        "match_embeddings",
        {
            "query_embedding": vector,
            "match_count": 5
        }
    ).execute()

    return response.data or []

async def generate_flashcards(text: str, context: str, retries: int = 2) -> LLMResponseModel:
    prompt = build_prompt(context, text)
    
    for attempt in range(retries):
        raw = await llm.generate(prompt)
        logger.info(f"Attempt {attempt + 1} Raw LLM output length: {len(raw)} characters")

        try:
            # 🔥 1. Use json_repair instead of regex to fix missing quotes/brackets
            parsed_json = json_repair.loads(raw)
            
            # 🔥 2. Validate against Pydantic schema
            validated_data = LLMResponseModel(**parsed_json)
            return validated_data
            
        except (ValueError, ValidationError) as e:
            logger.warning(f"Attempt {attempt + 1} failed validation: {e}")
            if attempt == retries - 1:
                logger.error("All retries exhausted.")
                return LLMResponseModel(skills=[], flashcards=[])

# -------------------- FastAPI --------------------
app = FastAPI(title="PrepDeck API v3")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class JobRequest(BaseModel):
    job_descriptions: List[str]
    user_id: str | None = None

class FlashcardStatusUpdate(BaseModel):
    status: str

class SessionNameUpdate(BaseModel):
    name: str

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    card_context: str
    messages: List[ChatMessage]

# -------------------- API --------------------
@app.post("/generate-from-resume")
async def generate_from_resume_endpoint(
    file: UploadFile = File(...), 
    session_name: Optional[str] = Form(None), 
    role: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None)
):
    try:
        # Read the PDF file
        pdf_content = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
        
        extracted_text = ""
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"
        
        if not extracted_text.strip():
             return {"status": "error", "message": "Could not extract text from PDF.", "flashcards": []}

        # Truncate text if it's too long
        resume_text = extracted_text[:3000]

        # 1. RAG
        results = search_similar_questions(resume_text)
        context = "\n".join([item["content"] for item in results]) if results else ""

        # 2. LLM Generate
        result_model = await generate_flashcards(resume_text, context)
        
        if not result_model.flashcards:
             return {"status": "success", "skills": result_model.skills, "flashcards": []}

        # 3. Create Session
        actual_name = session_name if session_name else (role if role else file.filename)
        session_data = {
            "type": "resume",
            "name": actual_name[:255] if actual_name else "Unknown Resume"
        }
        if user_id:
            session_data["user_id"] = user_id
        
        session_response = supabase.table("sessions").insert(session_data).execute()
        new_session_id = session_response.data[0]["id"]
        
        # 4. Insert flashcards
        flashcards_to_insert = [
            {
                "session_id": new_session_id,
                "question": card.question,
                "answer": card.answer,
                "skills": card.skills
            }
            for card in result_model.flashcards
        ]
        
        supabase.table("flashcards").insert(flashcards_to_insert).execute()
        logger.info(f"Resume processed. Saved {len(flashcards_to_insert)} cards to session {new_session_id}.")
        
        return {
            "status": "success",
            "session_id": new_session_id,
            "skills": result_model.skills,
            "flashcards": [f.dict() for f in result_model.flashcards]
        }
    except Exception as e:
        logger.error(f"Resume Pipeline error: {e}", exc_info=True)
        return {"status": "error", "message": str(e), "flashcards": []}

@app.post("/generate-from-jobs")
async def generate_from_jobs(request: JobRequest):
    try:
        combined_text = " ".join(request.job_descriptions)[:1500]

        # 1. ค้นหา Context จาก RAG
        results = search_similar_questions(combined_text)
        if not results:
            return {"status": "success", "skills": [], "flashcards": []}
        
        context = "\n".join([item["content"] for item in results])

        # 2. ให้ LLM สร้าง Flashcards
        result_model = await generate_flashcards(combined_text, context)

        # ถ้าไม่มี Flashcard กลับมา ให้ข้ามการเซฟลง DB
        if not result_model.flashcards:
             return {"status": "success", "skills": result_model.skills, "flashcards": []}

        # 🔥 3. สร้าง Session ใหม่ใน Database ก่อน
        session_data = {
            "type": "jobs"
        }
        if request.user_id:
            session_data["user_id"] = request.user_id
            
        session_response = supabase.table("sessions").insert(session_data).execute()
        
        # ดึง ID ของ Session ที่เพิ่งสร้างเสร็จ
        new_session_id = session_response.data[0]["id"]

        # 🔥 4. เตรียมข้อมูล Flashcards พร้อมผูกกับ session_id
        flashcards_to_insert = [
            {
                "session_id": new_session_id,
                "question": card.question,
                "answer": card.answer,
                "skills": card.skills
                # id, status, created_at ฐานข้อมูลจะสร้างให้เองโดยอัตโนมัติ
            }
            for card in result_model.flashcards
        ]

        # 🔥 5. บันทึก Flashcards ทั้งหมดลง Database ในรอบเดียว (Bulk Insert)
        supabase.table("flashcards").insert(flashcards_to_insert).execute()
        logger.info(f"บันทึก Flashcard จำนวน {len(flashcards_to_insert)} ใบลง Session: {new_session_id} สำเร็จ")

        # 6. ส่งผลลัพธ์กลับไปให้ Frontend
        return {
            "status": "success",
            "session_id": new_session_id, # ส่งของจริงกลับไปให้ Frontend
            "skills": result_model.skills,
            "flashcards": [f.dict() for f in result_model.flashcards]
        }

    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
        return {
            "status": "error",
            "message": str(e),
            "flashcards": []
        }

@app.get("/sessions/{session_id}/flashcards")
async def get_session_flashcards(session_id: str):
    try:
        response = supabase.table("flashcards").select("*").eq("session_id", session_id).execute()
        return {"status": "success", "flashcards": response.data}
    except Exception as e:
        logger.error(f"Error fetching flashcards for session {session_id}: {e}")
        return {"status": "error", "message": str(e)}

@app.patch("/flashcards/{flashcard_id}/status")
async def update_flashcard_status(flashcard_id: str, request: FlashcardStatusUpdate):
    try:
        if request.status not in ["known", "review", "needs_review"]:
            return {"status": "error", "message": "Invalid status. Must be 'known' or 'review'."}
            
        response = supabase.table("flashcards").update({"status": request.status}).eq("id", flashcard_id).execute()
        
        if not response.data:
            return {"status": "error", "message": "Flashcard not found or status unchanged."}
            
        return {"status": "success", "flashcard": response.data[0]}
    except Exception as e:
        logger.error(f"Error updating flashcard {flashcard_id}: {e}")
        return {"status": "error", "message": str(e)}

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    try:
        # Delete child flashcards first (safe even if cascade is set on FK)
        supabase.table("flashcards").delete().eq("session_id", session_id).execute()
        response = supabase.table("sessions").delete().eq("id", session_id).execute()
        if not response.data:
            return {"status": "error", "message": "Session not found."}
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error deleting session {session_id}: {e}")
        return {"status": "error", "message": str(e)}

@app.patch("/sessions/{session_id}")
async def update_session_name(session_id: str, request: SessionNameUpdate):
    try:
        response = supabase.table("sessions").update({"name": request.name}).eq("id", session_id).execute()
        
        if not response.data:
            return {"status": "error", "message": "Session not found."}
            
        return {"status": "success", "session": response.data[0]}
    except Exception as e:
        logger.error(f"Error updating session {session_id}: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Conversational AI endpoint for the AI Assistant chat screen."""
    try:
        system_prompt = (
            "You are an expert interview coach helping a candidate deeply understand "
            "the following interview flashcard topic.\n\n"
            f"Flashcard topic: {request.card_context}\n\n"
            "Answer concisely and clearly. Use examples when helpful. "
            "If asked for a follow-up question, provide one that a senior interviewer would ask."
        )

        messages = [{"role": "system", "content": system_prompt}]
        for msg in request.messages:
            if msg.role in ("user", "assistant"):
                messages.append({"role": msg.role, "content": msg.content})

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "llama3-8b-8192",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 512
        }

        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=data
            )

        if res.status_code == 200:
            reply = res.json()["choices"][0]["message"]["content"]
            return {"status": "success", "reply": reply}

        # Fallback to OpenRouter
        logger.warning(f"Groq chat failed ({res.status_code}), falling back to OpenRouter")
        or_headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "prepdeck-chat"
        }
        or_data = {
            "model": "meta-llama/llama-3-8b-instruct",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 512
        }
        async with httpx.AsyncClient(timeout=30) as client:
            or_res = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=or_headers,
                json=or_data
            )
        if or_res.status_code == 200:
            reply = or_res.json()["choices"][0]["message"]["content"]
            return {"status": "success", "reply": reply}

        raise Exception(f"Both LLM providers failed. OpenRouter: {or_res.text}")

    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}

@app.get("/")
def health():
    return {"message": "PrepDeck API v3 running 🚀"}

@app.get("/sessions")
def get_sessions():
    try:
        # ดึงข้อมูล session พร้อมกับ flashcards ที่อยู่ข้างใน เพื่อเอามานับจำนวน
        res = supabase.table("sessions").select("id, name, type, created_at, flashcards(id, status)").order("created_at", desc=True).execute()
        
        formatted_sessions = []
        for s in res.data:
            cards = s.get("flashcards", [])
            card_count = len(cards)
            
            # คำนวณความแม่นยำ (คำศัพท์ที่ตอบ known หารด้วยจำนวนคำศัพท์ทั้งหมดใน session)
            known_count = sum(1 for c in cards if c.get("status") == "known")
            accuracy = int((known_count / card_count * 100)) if card_count > 0 else 0
            
            # แปลงวันที่ให้อ่านง่ายขึ้น (ตัดมาแค่ YYYY-MM-DD)
            date_str = s["created_at"].split("T")[0] if "T" in s["created_at"] else s["created_at"][:10]
            
            formatted_sessions.append({
                "id": s["id"],
                "name": s.get("name"),
                "type": s["type"].capitalize() if s["type"] else "Jobs",
                "cardCount": card_count,
                "date": date_str,
                "accuracy": accuracy
            })
            
        return {"status": "success", "sessions": formatted_sessions}
    except Exception as e:
        logger.error(f"Error fetching sessions: {e}")
        return {"status": "error", "message": str(e), "sessions": []}