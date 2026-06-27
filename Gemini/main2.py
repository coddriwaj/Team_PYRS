from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from google import genai
from google.genai import types
from pymongo import MongoClient
from datetime import datetime
import json
import os
import uuid

# ─── App Setup ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Tourist Speech Translation API",
    description="Translates tourist audio/text (any language) to English and stores in MongoDB",
    version="2.0.0"
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
    text: str
    tourist_name: Optional[str] = "Anonymous"
    tourist_nationality: Optional[str] = None
    location: Optional[str] = None

class TranslationResponse(BaseModel):
    id: str
    input_type: str                  # "text" or "audio"
    original_text: str               # transcribed text (if audio) or raw input
    translated_text: str
    detected_language: str
    tourist_name: str
    tourist_nationality: Optional[str]
    location: Optional[str]
    timestamp: str
    saved_to_db: bool

# ─── Gemini: Text Translation ─────────────────────────────────────────────────
def translate_with_gemini(text: str) -> dict:
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


# ─── Gemini: Audio Transcription + Translation ────────────────────────────────
def transcribe_and_translate_audio(audio_bytes: bytes, mime_type: str) -> dict:
    prompt = """
Listen to this audio carefully.
1. Transcribe exactly what is being said (in the original language).
2. Detect the language.
3. Translate the speech to English.

Respond ONLY with a valid JSON object — no markdown, no backticks, no explanation:

{
  "original_transcript": "<exact words spoken in the original language>",
  "detected_language": "<language name>",
  "translated_text": "<accurate English translation>",
  "confidence": "<high | medium | low>"
}
"""
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
            prompt
        ]
    )
    raw = response.text.strip().replace("```json", "").replace("```", "").strip()
    return json.loads(raw)


# ─── Save to MongoDB ──────────────────────────────────────────────────────────
def save_to_mongo(doc: dict) -> bool:
    try:
        translations_collection.insert_one(doc)
        return True
    except Exception as e:
        print(f"[MongoDB Error] {e}")
        return False


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "message": "Tourist Speech Translation API v2",
        "endpoints": {
            "POST /translate/text":    "Submit text in any language → English → MongoDB",
            "POST /translate/audio":   "Upload audio file → transcribe → English → MongoDB",
            "GET  /translations":      "List all saved translations",
            "GET  /translations/{id}": "Get one translation by ID",
            "GET  /health":            "Health check"
        }
    }


@app.get("/health")
def health_check():
    try:
        mongo_client.admin.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {"status": "healthy", "mongodb": db_status, "timestamp": datetime.utcnow().isoformat()}


# ── 1. Text Input ─────────────────────────────────────────────────────────────
@app.post("/translate/text", response_model=TranslationResponse)
def translate_text(request: SpeechInput):
    """Submit text in any language. Translates to English and saves to MongoDB."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    try:
        result = translate_with_gemini(request.text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Gemini response could not be parsed.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

    record_id = str(uuid.uuid4())
    doc = {
        "_id": record_id,
        "input_type": "text",
        "original_text": request.text,
        "translated_text": result.get("translated_text", ""),
        "detected_language": result.get("detected_language", "Unknown"),
        "confidence": result.get("confidence", "medium"),
        "tourist_name": request.tourist_name,
        "tourist_nationality": request.tourist_nationality,
        "location": request.location,
        "timestamp": datetime.utcnow().isoformat()
    }
    saved = save_to_mongo(doc)

    return TranslationResponse(
        id=record_id, input_type="text",
        original_text=doc["original_text"],
        translated_text=doc["translated_text"],
        detected_language=doc["detected_language"],
        tourist_name=request.tourist_name,
        tourist_nationality=request.tourist_nationality,
        location=request.location,
        timestamp=doc["timestamp"],
        saved_to_db=saved
    )


# ── 2. Audio Input ────────────────────────────────────────────────────────────
@app.post("/translate/audio", response_model=TranslationResponse)
async def translate_audio(
    audio: UploadFile = File(..., description="Audio file: mp3, wav, ogg, m4a, webm"),
    tourist_name: Optional[str] = Form("Anonymous"),
    tourist_nationality: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
):
    """
    Upload an audio file (mp3/wav/ogg/m4a/webm).
    Gemini will transcribe the speech, detect the language, translate to English,
    and save the result to MongoDB.
    """
    SUPPORTED = {
        "audio/mpeg": "audio/mpeg",
        "audio/mp3":  "audio/mpeg",
        "audio/wav":  "audio/wav",
        "audio/ogg":  "audio/ogg",
        "audio/m4a":  "audio/mp4",
        "audio/mp4":  "audio/mp4",
        "audio/webm": "audio/webm",
    }

    content_type = audio.content_type or ""
    if content_type not in SUPPORTED:
        ext = (audio.filename or "").split(".")[-1].lower()
        ext_map = {
            "mp3": "audio/mpeg", "wav": "audio/wav",
            "ogg": "audio/ogg",  "m4a": "audio/mp4",
            "mp4": "audio/mp4",  "webm": "audio/webm"
        }
        content_type = ext_map.get(ext, "")

    if not content_type:
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio format. Use mp3, wav, ogg, m4a, or webm."
        )

    mime_type = SUPPORTED.get(content_type, content_type)
    audio_bytes = await audio.read()

    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Audio file is empty.")

    try:
        result = transcribe_and_translate_audio(audio_bytes, mime_type)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Gemini could not parse the audio response.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio processing failed: {str(e)}")

    record_id = str(uuid.uuid4())
    doc = {
        "_id": record_id,
        "input_type": "audio",
        "original_text": result.get("original_transcript", ""),
        "translated_text": result.get("translated_text", ""),
        "detected_language": result.get("detected_language", "Unknown"),
        "confidence": result.get("confidence", "medium"),
        "audio_filename": audio.filename,
        "tourist_name": tourist_name,
        "tourist_nationality": tourist_nationality,
        "location": location,
        "timestamp": datetime.utcnow().isoformat()
    }
    saved = save_to_mongo(doc)

    return TranslationResponse(
        id=record_id, input_type="audio",
        original_text=doc["original_text"],
        translated_text=doc["translated_text"],
        detected_language=doc["detected_language"],
        tourist_name=tourist_name,
        tourist_nationality=tourist_nationality,
        location=location,
        timestamp=doc["timestamp"],
        saved_to_db=saved
    )


# ── 3. Fetch All Translations ─────────────────────────────────────────────────
@app.get("/translations")
def get_all_translations(limit: int = 50):
    docs = list(
        translations_collection.find(
            {},
            {"_id": 1, "input_type": 1, "original_text": 1,
             "translated_text": 1, "detected_language": 1,
             "tourist_name": 1, "timestamp": 1}
        ).sort("timestamp", -1).limit(limit)
    )
    for doc in docs:
        doc["id"] = doc.pop("_id")
    return {"total": len(docs), "translations": docs}


# ── 4. Fetch Single Translation ───────────────────────────────────────────────
@app.get("/translations/{record_id}")
def get_translation(record_id: str):
    doc = translations_collection.find_one({"_id": record_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Translation record not found.")
    doc["id"] = doc.pop("_id")
    return doc