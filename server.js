import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// ✅ Health check
app.get("/", (req, res) => {
  res.send("API is running ✅ Use POST /chat");
});

const PORT = process.env.PORT || 5050;
const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey });

// ✅ Session memory store (in-memory)
const sessions = {};
const MAX_HISTORY = 10; // last 10 messages (user+assistant)

// ✅ Dummy fallback (works without billing)
function dummyReply(message, history = []) {
  const lower = message.toLowerCase();
  const lastUserMsgs = history
    .filter((m) => m.role === "user")
    .slice(-2)
    .map((m) => m.content)
    .join(" | ");

  if (lower.includes("website") || lower.includes("sections")) {
    return `Website sections:\n- Hero + CTA\n- Services\n- Why Us\n- Testimonials\n- Portfolio\n- FAQs\n- Contact\n\nContext remembered: ${lastUserMsgs || "No previous context"}`;
  }

  if (lower.includes("automation") || lower.includes("crm") || lower.includes("webhook")) {
    return `Automation ideas:\n1) Form → CRM (HubSpot/Zoho)\n2) Form → WhatsApp + Email follow-up\n3) Lead → Google Sheet + Slack notification\n4) Booking → Calendar reminder\n\nContext remembered: ${lastUserMsgs || "No previous context"}`;
  }

  return `Got it: "${message}"\n\nNext steps:\n1) Tell me your business type\n2) Tell me your goal (leads/sales/support)\n\nContext remembered: ${lastUserMsgs || "No previous context"}`;
}

// ✅ Chat endpoint with memory
app.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        details: "Send JSON like { sessionId: 'user1', message: 'hi' }",
      });
    }

    const sid = sessionId && typeof sessionId === "string" ? sessionId : "default";

    // Create session if not exists
    if (!sessions[sid]) {
      sessions[sid] = [];
    }

    // Store user message in memory
    sessions[sid].push({ role: "user", content: message });

    // Keep only last MAX_HISTORY messages
    if (sessions[sid].length > MAX_HISTORY) {
      sessions[sid] = sessions[sid].slice(-MAX_HISTORY);
    }

    // If no API key → dummy mode
    if (!apiKey) {
      const reply = dummyReply(message, sessions[sid]);

      sessions[sid].push({ role: "assistant", content: reply });
      if (sessions[sid].length > MAX_HISTORY) {
        sessions[sid] = sessions[sid].slice(-MAX_HISTORY);
      }

      return res.json({
        reply,
        mode: "dummy",
        sessionId: sid,
        historyCount: sessions[sid].length,
      });
    }

    // ✅ Timeout so request never loads forever
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const completion = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          max_tokens: 250,
          messages: [
            {
              role: "system",
              content:
                "You are Jmbliss AI Assistant. Help with website structure, automation ideas, and AI features. Keep replies short, practical, and clear.",
            },
            ...sessions[sid], // ✅ send memory
          ],
        },
        { signal: controller.signal }
      );

      clearTimeout(timeout);

      const reply = completion?.choices?.[0]?.message?.content || "";

      // Store assistant reply in memory
      sessions[sid].push({ role: "assistant", content: reply });
      if (sessions[sid].length > MAX_HISTORY) {
        sessions[sid] = sessions[sid].slice(-MAX_HISTORY);
      }

      return res.json({
        reply,
        mode: "openai",
        sessionId: sid,
        historyCount: sessions[sid].length,
      });
    } catch (err) {
      clearTimeout(timeout);

      // OpenAI failed → dummy fallback
      const reply = dummyReply(message, sessions[sid]);

      sessions[sid].push({ role: "assistant", content: reply });
      if (sessions[sid].length > MAX_HISTORY) {
        sessions[sid] = sessions[sid].slice(-MAX_HISTORY);
      }

      return res.json({
        reply,
        mode: "dummy",
        sessionId: sid,
        historyCount: sessions[sid].length,
        details: String(err?.message || err),
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      details: String(error?.message || error),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});