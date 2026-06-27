import express from "express";
import Translation from "../models/Translation.js";

const router = express.Router();

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const stripJsonFence = (text = "") =>
  text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

const normalizeLevel = (value) => {
  const normalized = String(value || "medium").toLowerCase();
  return ["high", "medium", "low"].includes(normalized) ? normalized : "medium";
};

const readGeminiText = (payload) =>
  payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

router.post("/transcribe-classify", async (req, res) => {
  const {
    audioBase64,
    mimeType = "audio/webm",
    touristName = "Anonymous",
    touristNationality = "",
    location = "",
  } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ message: "GEMINI_API_KEY is not configured on the backend." });
  }

  if (!audioBase64) {
    return res.status(400).json({ message: "audioBase64 is required." });
  }

  const prompt = `
Listen to this tourist complaint audio carefully.
1. Transcribe exactly what is being said in the original language.
2. Detect the spoken language.
3. Translate the speech to English.
4. Summarize the complaint in 1-2 sentences.
5. Classify the complaint category.
6. Assess criticalness.

Respond ONLY with a valid JSON object, no markdown, no backticks:

{
  "original_transcript": "<exact words spoken in the original language>",
  "detected_language": "<language name>",
  "translated_text": "<accurate English translation>",
  "confidence": "<high | medium | low>",
  "summary": "<1-2 sentence summary>",
  "criticalness": "<high | medium | low>",
  "category": "<Hotel / Accommodation | Transport | Tour Guide | Pricing / Overcharging | Safety | Cleanliness | Harassment | Other>"
}
`;

  try {
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: audioBase64,
                },
              },
              { text: prompt },
            ],
          },
        ],
      }),
    });

    const geminiPayload = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return res.status(geminiResponse.status).json({
        message: geminiPayload?.error?.message || "Gemini audio processing failed.",
      });
    }

    const rawText = readGeminiText(geminiPayload);
    if (!rawText) {
      return res.status(502).json({ message: "Gemini returned an empty response." });
    }

    let result;
    try {
      result = JSON.parse(stripJsonFence(rawText));
    } catch {
      return res.status(502).json({
        message: "Gemini response could not be parsed as JSON.",
        rawText,
      });
    }

    const record = await Translation.create({
      inputType: "audio",
      originalTranscript: result.original_transcript || "",
      translatedText: result.translated_text || "",
      detectedLanguage: result.detected_language || "Unknown",
      confidence: normalizeLevel(result.confidence),
      summary: result.summary || "",
      criticalness: normalizeLevel(result.criticalness),
      category: result.category || "Other",
      touristName,
      touristNationality,
      location,
      audioMimeType: mimeType,
    });

    return res.status(201).json({
      id: record._id,
      originalTranscript: record.originalTranscript,
      translatedText: record.translatedText,
      detectedLanguage: record.detectedLanguage,
      confidence: record.confidence,
      summary: record.summary,
      criticalness: record.criticalness,
      category: record.category,
      touristName: record.touristName,
      touristNationality: record.touristNationality,
      location: record.location,
      createdAt: record.createdAt,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to process audio with Gemini.",
      error: error.message,
    });
  }
});

export default router;
