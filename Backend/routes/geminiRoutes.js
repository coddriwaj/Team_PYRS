import express from "express";
import nodemailer from "nodemailer";
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

const toComplaintDto = (record) => ({
  id: record._id,
  inputType: record.inputType || "text",
  originalTranscript: record.originalTranscript,
  translatedText: record.translatedText,
  detectedLanguage: record.detectedLanguage,
  confidence: record.confidence,
  summary: record.summary,
  criticalness: record.criticalness,
  category: record.category,
  concernedAuthority: record.concernedAuthority,
  concernedAuthorityEmail: record.concernedAuthorityEmail,
  notificationEmailSent: record.notificationEmailSent,
  notificationEmailError: record.notificationEmailError,
  touristName: record.touristName,
  touristNationality: record.touristNationality,
  location: record.location,
  photoBase64: record.photoBase64,
  photoMimeType: record.photoMimeType,
  photoFileName: record.photoFileName,
  status: record.status || "not_resolved",
  createdAt: record.createdAt,
});

const STATUS_VALUES = ["not_resolved", "in_process", "resolved"];
const CATEGORY_OPTIONS = "Road Problems | Hotel / Accommodation | Transport | Tour Guide | Pricing / Overcharging | Safety | Cleanliness | Harassment | Health / Medical | Lost Item | Other";
const AUTHORITY_OPTIONS = "Roads / Infrastructure Department | Tourist Police | Tourism Safety Unit | Transport Management Office | Hotel Standards Authority | Consumer Protection / Pricing Cell | Guide Licensing Board | Municipal Sanitation Office | Health Emergency Desk | Lost and Found Desk | Tourism Complaint Cell";

const AUTHORITY_BY_CATEGORY = {
  "road problems": "Roads / Infrastructure Department",
  "hotel / accommodation": "Hotel Standards Authority",
  transport: "Transport Management Office",
  "tour guide": "Guide Licensing Board",
  "pricing / overcharging": "Consumer Protection / Pricing Cell",
  safety: "Tourism Safety Unit",
  cleanliness: "Municipal Sanitation Office",
  harassment: "Tourist Police",
  "health / medical": "Health Emergency Desk",
  "lost item": "Lost and Found Desk",
  other: "Tourism Complaint Cell",
};

const AUTHORITY_EMAIL_ENV_BY_AUTHORITY = {
  "Roads / Infrastructure Department": "AUTHORITY_ROADS_EMAIL",
  "Tourist Police": "AUTHORITY_TOURIST_POLICE_EMAIL",
  "Tourism Safety Unit": "AUTHORITY_SAFETY_EMAIL",
  "Transport Management Office": "AUTHORITY_TRANSPORT_EMAIL",
  "Hotel Standards Authority": "AUTHORITY_HOTEL_EMAIL",
  "Consumer Protection / Pricing Cell": "AUTHORITY_PRICING_EMAIL",
  "Guide Licensing Board": "AUTHORITY_GUIDE_EMAIL",
  "Municipal Sanitation Office": "AUTHORITY_CLEANLINESS_EMAIL",
  "Health Emergency Desk": "AUTHORITY_HEALTH_EMAIL",
  "Lost and Found Desk": "AUTHORITY_LOST_ITEM_EMAIL",
  "Tourism Complaint Cell": "DEFAULT_AUTHORITY_EMAIL",
};

const isUsableConfigValue = (value) =>
  Boolean(value) &&
  !String(value).includes("your_") &&
  !String(value).includes("example.com");

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getConcernedAuthority = (category, geminiAuthority) => {
  if (geminiAuthority && AUTHORITY_EMAIL_ENV_BY_AUTHORITY[geminiAuthority]) return geminiAuthority;
  return AUTHORITY_BY_CATEGORY[String(category || "Other").toLowerCase()] || "Tourism Complaint Cell";
};

const resolveComplaintAuthority = (record) => {
  const authority = getConcernedAuthority(record.category, record.concernedAuthority);
  record.concernedAuthority = authority;
  record.concernedAuthorityEmail = getAuthorityEmail(authority);
  return record;
};

const getAuthorityEmail = (authority) => {
  const envKey = AUTHORITY_EMAIL_ENV_BY_AUTHORITY[authority] || "DEFAULT_AUTHORITY_EMAIL";
  const configuredEmail = process.env[envKey] || process.env.DEFAULT_AUTHORITY_EMAIL || "";
  return isUsableConfigValue(configuredEmail) ? configuredEmail : "";
};

const createTransporter = () => {
  if (
    !isUsableConfigValue(process.env.SMTP_HOST) ||
    !isUsableConfigValue(process.env.SMTP_USER) ||
    !isUsableConfigValue(process.env.SMTP_PASS)
  ) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const buildComplaintEmail = (record) => {
  const safe = {
    id: escapeHtml(record._id),
    authority: escapeHtml(record.concernedAuthority),
    category: escapeHtml(record.category),
    criticalness: escapeHtml(record.criticalness),
    status: escapeHtml(record.status),
    inputType: escapeHtml(record.inputType),
    language: escapeHtml(record.detectedLanguage),
    touristName: escapeHtml(record.touristName || "Anonymous"),
    touristNationality: escapeHtml(record.touristNationality || "nationality not provided"),
    location: escapeHtml(record.location || "Not provided"),
    photoFileName: escapeHtml(record.photoFileName || "No photo attached"),
    summary: escapeHtml(record.summary || "Not available"),
    originalTranscript: escapeHtml(record.originalTranscript || "Not available"),
    translatedText: escapeHtml(record.translatedText || "Not available"),
  };

  const lines = [
    `Complaint ID: ${record._id}`,
    `Concerned authority: ${record.concernedAuthority}`,
    `Category: ${record.category}`,
    `Criticalness: ${record.criticalness}`,
    `Status: ${record.status}`,
    `Input type: ${record.inputType}`,
    `Detected language: ${record.detectedLanguage}`,
    `Tourist name: ${record.touristName || "Anonymous"}`,
    `Tourist nationality: ${record.touristNationality || "Not provided"}`,
    `Location: ${record.location || "Not provided"}`,
    `Photo attachment: ${record.photoFileName || "No photo attached"}`,
    "",
    `Summary: ${record.summary || "Not available"}`,
    "",
    `Original complaint: ${record.originalTranscript || "Not available"}`,
    "",
    `English translation: ${record.translatedText || "Not available"}`,
  ];

  return {
    subject: `[${record.criticalness?.toUpperCase() || "MEDIUM"}] ${record.category} complaint - ${record.concernedAuthority}`,
    text: lines.join("\n"),
    html: `
      <h2>Tourism Complaint Report</h2>
      <p><strong>Complaint ID:</strong> ${safe.id}</p>
      <p><strong>Concerned authority:</strong> ${safe.authority}</p>
      <p><strong>Category:</strong> ${safe.category}</p>
      <p><strong>Criticalness:</strong> ${safe.criticalness}</p>
      <p><strong>Status:</strong> ${safe.status}</p>
      <p><strong>Input type:</strong> ${safe.inputType}</p>
      <p><strong>Detected language:</strong> ${safe.language}</p>
      <p><strong>Tourist:</strong> ${safe.touristName} (${safe.touristNationality})</p>
      <p><strong>Location:</strong> ${safe.location}</p>
      <p><strong>Photo attachment:</strong> ${safe.photoFileName}</p>
      <h3>Summary</h3>
      <p>${safe.summary}</p>
      <h3>Original Complaint</h3>
      <p>${safe.originalTranscript}</p>
      <h3>English Translation</h3>
      <p>${safe.translatedText}</p>
    `,
  };
};

const notifyConcernedAuthority = async (record) => {
  const to = record.concernedAuthorityEmail;
  const transporter = createTransporter();

  if (!to) {
    return { sent: false, error: "No authority email configured." };
  }

  if (!transporter) {
    return { sent: false, error: "SMTP is not configured." };
  }

  const email = buildComplaintEmail(record);
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    attachments: record.photoBase64 ? [{
      filename: record.photoFileName || "complaint-photo.jpg",
      content: record.photoBase64,
      encoding: "base64",
      contentType: record.photoMimeType || "image/jpeg",
    }] : [],
  });

  return { sent: true, error: "" };
};

const persistNotificationStatus = async (record) => {
  try {
    const result = await notifyConcernedAuthority(record);
    record.notificationEmailSent = result.sent;
    record.notificationEmailError = result.error;
  } catch (error) {
    record.notificationEmailSent = false;
    record.notificationEmailError = error.message;
  }

  await record.save();
  return record;
};

const complaintSubmissionMessage = (record, fallback) => {
  if (record.notificationEmailSent) {
    return `${fallback} Notification email sent to ${record.concernedAuthority}.`;
  }

  return `${fallback} Complaint routed to ${record.concernedAuthority}, but email is pending.`;
};

router.get("/complaints", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const records = await Translation.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return res.json({
    total: records.length,
    complaints: records.map(toComplaintDto),
  });
});

router.get("/stats", async (req, res) => {
  const [received, resolved, inProcess, notResolved, highPriority] = await Promise.all([
    Translation.countDocuments({}),
    Translation.countDocuments({ status: "resolved" }),
    Translation.countDocuments({ status: "in_process" }),
    Translation.countDocuments({ status: "not_resolved" }),
    Translation.countDocuments({ criticalness: "high" }),
  ]);

  return res.json({
    received,
    resolved,
    inProcess,
    notResolved,
    highPriority,
  });
});

router.patch("/complaints/:id/status", async (req, res) => {
  const { status } = req.body;

  if (!STATUS_VALUES.includes(status)) {
    return res.status(400).json({
      message: "Invalid status. Use not_resolved, in_process, or resolved.",
    });
  }

  const record = await Translation.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  if (!record) {
    return res.status(404).json({ message: "Complaint not found." });
  }

  return res.json({
    message: "Complaint status updated.",
    complaint: toComplaintDto(record),
  });
});

router.post("/complaints/:id/notify", async (req, res) => {
  const record = await Translation.findById(req.params.id);

  if (!record) {
    return res.status(404).json({ message: "Complaint not found." });
  }

  resolveComplaintAuthority(record);
  await persistNotificationStatus(record);

  return res.json({
    message: record.notificationEmailSent
      ? "Notification email sent."
      : "Notification email was not sent. Check SMTP and authority email configuration.",
    complaint: toComplaintDto(record),
  });
});

router.post("/classify-text", async (req, res) => {
  const {
    text,
    touristName = "Anonymous",
    touristNationality = "",
    location = "",
    photoBase64 = "",
    photoMimeType = "",
    photoFileName = "",
  } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ message: "GEMINI_API_KEY is not configured on the backend." });
  }

  if (!text?.trim()) {
    return res.status(400).json({ message: "Complaint text is required." });
  }

  const prompt = `
Classify this tourist complaint text carefully.
1. Detect the language.
2. Translate the complaint to English if needed.
3. Summarize the complaint in 1-2 sentences.
4. Classify the complaint category.
5. Assess criticalness.

Respond ONLY with a valid JSON object, no markdown, no backticks:

{
  "detected_language": "<language name>",
  "translated_text": "<accurate English translation>",
  "confidence": "<high | medium | low>",
  "summary": "<1-2 sentence summary>",
  "criticalness": "<high | medium | low>",
  "category": "<${CATEGORY_OPTIONS}>",
  "concerned_authority": "<${AUTHORITY_OPTIONS}>"
}

Complaint text:
"""${text.trim()}"""
`;

  try {
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    const geminiPayload = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return res.status(geminiResponse.status).json({
        message: geminiPayload?.error?.message || "Gemini text classification failed.",
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
      inputType: "text",
      originalTranscript: text.trim(),
      translatedText: result.translated_text || text.trim(),
      detectedLanguage: result.detected_language || "Unknown",
      confidence: normalizeLevel(result.confidence),
      summary: result.summary || "",
      criticalness: normalizeLevel(result.criticalness),
      category: result.category || "Other",
      concernedAuthority: getConcernedAuthority(result.category, result.concerned_authority),
      touristName,
      touristNationality,
      location,
      photoBase64,
      photoMimeType,
      photoFileName,
    });

    resolveComplaintAuthority(record);
    await persistNotificationStatus(record);

    return res.status(201).json({
      message: complaintSubmissionMessage(record, "Text complaint submitted successfully."),
      complaint: toComplaintDto(record),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to classify text with Gemini.",
      error: error.message,
    });
  }
});

router.post("/transcribe-classify", async (req, res) => {
  const {
    audioBase64,
    mimeType = "audio/webm",
    touristName = "Anonymous",
    touristNationality = "",
    location = "",
    photoBase64 = "",
    photoMimeType = "",
    photoFileName = "",
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
  "category": "<${CATEGORY_OPTIONS}>",
  "concerned_authority": "<${AUTHORITY_OPTIONS}>"
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
      concernedAuthority: getConcernedAuthority(result.category, result.concerned_authority),
      touristName,
      touristNationality,
      location,
      audioMimeType: mimeType,
      photoBase64,
      photoMimeType,
      photoFileName,
    });

    resolveComplaintAuthority(record);
    await persistNotificationStatus(record);

    return res.status(201).json({
      message: complaintSubmissionMessage(record, "Complaint submitted successfully."),
      complaint: toComplaintDto(record),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to process audio with Gemini.",
      error: error.message,
    });
  }
});

export default router;
