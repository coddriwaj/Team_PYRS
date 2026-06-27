import mongoose from "mongoose";

const translationSchema = new mongoose.Schema(
  {
    inputType: {
      type: String,
      enum: ["audio", "text"],
      default: "text",
    },
    originalTranscript: {
      type: String,
      default: "",
    },
    translatedText: {
      type: String,
      default: "",
    },
    detectedLanguage: {
      type: String,
      default: "Unknown",
    },
    confidence: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    summary: {
      type: String,
      default: "",
    },
    criticalness: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    category: {
      type: String,
      default: "Other",
    },
    concernedAuthority: {
      type: String,
      default: "Tourism Complaint Cell",
    },
    concernedAuthorityEmail: {
      type: String,
      default: "",
    },
    notificationEmailSent: {
      type: Boolean,
      default: false,
    },
    notificationEmailError: {
      type: String,
      default: "",
    },
    touristName: {
      type: String,
      default: "Anonymous",
    },
    touristNationality: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    audioMimeType: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["not_resolved", "in_process", "resolved"],
      default: "not_resolved",
    },
  },
  {
    timestamps: true,
  }
);

const Translation = mongoose.model("Translation", translationSchema);

export default Translation;
