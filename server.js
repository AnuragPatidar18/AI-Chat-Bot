import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Health check
app.get("/", (req, res) => {
  res.send("API is running ✅ Use POST /chat");
});

// Store chat sessions
const sessions = {};

const PORT = process.env.PORT || 5000;
const apiKey = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey });

// Dummy reply if OpenAI fails
function dummyReply(message) {
  const lower = message.toLowerCase();

  if (lower.includes("website") || lower.includes("sections")) {
    return `Website sections:
    - Hero + CTA
    - Services
    - Why Us
    - Testimonials
    - Portfolio
    - FAQs
    - Contact`;
  }

  if (lower.includes("automation") || lower.includes("crm")) {
    return `Automation ideas:
    1) Form → CRM
    2) Form → WhatsApp + Email
    3) Lead → Google Sheet
    4) Booking → Calendar reminder`;
  }

  return `Thanks! I got your message: "${message}".
Tell me your business type and I’ll suggest the best plan.`;
}

// Chat API
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Send { message: '...' }" });
    }

    // If key missing → use dummy
    if (!apiKey) {
      return res.json({ reply: dummyReply(message), mode: "dummy" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const completion = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          max_tokens: 200,
          messages: [
            {
              role: "system",
              content: "You are a helpful business assistant. Reply short and practical."
            },
            { role: "user", content: message }
          ],
        },
        { signal: controller.signal }
      );

      clearTimeout(timeout);

      const reply = completion?.choices?.[0]?.message?.content || "";

      return res.json({
        reply,
        mode: "openai"
      });

    } catch (err) {

      clearTimeout(timeout);

      return res.json({
        reply: dummyReply(message),
        mode: "dummy",
        details: String(err?.message || err),
      });
    }

  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      details: String(error?.message || error)
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});