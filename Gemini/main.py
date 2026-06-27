from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from google import genai
from pymongo import MongoClient
from datetime import datetime
import json
import os
import uuid

# ─── App Setup ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Tourist Speech Translation API",
    description="Translates tourist speech (any language) to English and stores in MongoDB",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Gemini Setup ─────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AQ.Ab8RN6IiXFwwNqvU3gk7wEr14_wUIFTZ7InZCzCvuIBoJAmitw")
client = genai.Client(api_key=GEMINI_API_KEY)

# ─── MongoDB Setup ────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://sudip10k89_db_user:C9ogND7xBBnnssJe@cluster0.2bgz48f.mongodb.net/?appName=Cluster0")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["tourist_translations"]
translations_collection = db["translations"]

# ─── Models ───────────────────────────────────────────────────────────────────
class SpeechInput(BaseModel):
    text: str                                   # Raw speech/text from tourist (any language)
    tourist_name: Optional[str] = "Anonymous"
    tourist_nationality: Optional[str] = None
    location: Optional[str] = None

class TranslationResponse(BaseModel):
    id: str
    original_text: str
    translated_text: str
    detected_language: str
    tourist_name: str
    tourist_nationality: Optional[str]
    location: Optional[str]
    timestamp: str
    saved_to_db: bool

# ─── Gemini Helper ────────────────────────────────────────────────────────────
def translate_with_gemini(text: str) -> dict:
    """Detect language and translate to English using Gemini."""
    prompt = f"""
Detect the language of the following text and translate it to English.
Respond ONLY with a valid JSON object — no markdown, no backticks, no explanation.

{{
  "detected_language": "<language name, e.g. French, Nepali, Hindi, Spanish>",
  "translated_text": "<accurate English translation of the input text>",
  "confidence": "<high | medium | low>"
}}

Text to translate:
\"\"\"{text}\"\"\"
"""
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    raw = response.text.strip().replace("```json", "").replace("```", "").strip()
    return json.loads(raw)


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "message": "Tourist Speech Translation API",
        "endpoints": {
            "POST /translate": "Translate tourist speech to English and save to MongoDB",
            "GET /translations": "Retrieve all saved translations",
            "GET /translations/{id}": "Get a single translation by ID",
            "GET /health": "Health check"
        }
    }


@app.get("/health")
def health_check():
    try:
        mongo_client.admin.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {
        "status": "healthy",
        "mongodb": db_status,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/translate", response_model=TranslationResponse)
def translate_speech(request: SpeechInput):
    """
    Accepts tourist speech in any language.
    Translates it to English using Gemini and saves the result to MongoDB.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Input text cannot be empty.")

    # Translate via Gemini
    try:
        result = translate_with_gemini(request.text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Gemini response could not be parsed. Please try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

    # Build the document to store
    record_id = str(uuid.uuid4())
    doc = {
        "_id": record_id,
        "original_text": request.text,
        "translated_text": result.get("translated_text", ""),
        "detected_language": result.get("detected_language", "Unknown"),
        "confidence": result.get("confidence", "medium"),
        "tourist_name": request.tourist_name,
        "tourist_nationality": request.tourist_nationality,
        "location": request.location,
        "timestamp": datetime.utcnow().isoformat()
    }

    # Save to MongoDB
    saved = False
    try:
        translations_collection.insert_one(doc)
        saved = True
    except Exception as e:
        # Don't crash the API if MongoDB fails — just flag it
        print(f"[MongoDB Error] {e}")

    return TranslationResponse(
        id=record_id,
        original_text=request.text,
        translated_text=doc["translated_text"],
        detected_language=doc["detected_language"],
        tourist_name=request.tourist_name,
        tourist_nationality=request.tourist_nationality,
        location=request.location,
        timestamp=doc["timestamp"],
        saved_to_db=saved
    )


@app.get("/translations")
def get_all_translations(limit: int = 50):
    """Retrieve the most recent translations stored in MongoDB."""
    docs = list(
        translations_collection.find(
            {},
            {"_id": 1, "original_text": 1, "translated_text": 1,
             "detected_language": 1, "tourist_name": 1, "timestamp": 1}
        ).sort("timestamp", -1).limit(limit)
    )
    # Rename _id to id for cleaner JSON output
    for doc in docs:
        doc["id"] = doc.pop("_id")
    return {"total": len(docs), "translations": docs}


@app.get("/translations/{record_id}")
def get_translation(record_id: str):
    """Fetch a single translation record by its ID."""
    doc = translations_collection.find_one({"_id": record_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Translation record not found.")
    doc["id"] = doc.pop("_id")
    return doc