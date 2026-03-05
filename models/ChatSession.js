import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, required: true },     // "user" | "assistant"
    content: { type: String, required: true },
  },
  { timestamps: true }
);

const chatSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("ChatSession", chatSessionSchema);