import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";

import ChatSession from "./models/ChatSession.js";
import Lead from "./models/Lead.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5050;
const apiKey = process.env.OPENAI_API_KEY;

/* -------------------------------
   MongoDB Connection
--------------------------------*/
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.log("MongoDB connection error ❌", err));

/* -------------------------------
   OpenAI Setup
--------------------------------*/
const openai = new OpenAI({ apiKey });

/* -------------------------------
   Dummy AI fallback
--------------------------------*/
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

  if (lower.includes("marketing")) {
    return `Simple marketing strategy:
1) Local SEO
2) Instagram reels
3) Google Ads for nearby customers
4) Referral discount campaign`;
  }

  return `Thanks! I received your message: "${message}".  
Tell me your business type and I’ll suggest a plan.`;
}

/* -------------------------------
   AI Chat Endpoint
--------------------------------*/
app.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body || {};

    if (!message) {
      return res.status(400).json({
        error: "Send { message: '...' }",
      });
    }

    let session = await ChatSession.findOne({ sessionId });

    if (!session) {
      session = await ChatSession.create({
        sessionId,
        messages: [],
      });
    }

    session.messages.push({
      role: "user",
      content: message,
    });

    let reply = "";

    try {
      if (!apiKey) throw new Error("No OpenAI key");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful business assistant. Reply short and practical.",
          },
          ...session.messages,
        ],
        max_tokens: 200,
      });

      reply = completion?.choices?.[0]?.message?.content || "";

    } catch (err) {
      reply = dummyReply(message);
    }

    session.messages.push({
      role: "assistant",
      content: reply,
    });

    await session.save();

    return res.json({
      reply,
      sessionId,
    });

  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      details: String(error?.message || error),
    });
  }
});

/* -------------------------------
   Day 6 Automation Webhook
   Lead Capture Endpoint
--------------------------------*/
app.post("/webhook/lead", async (req, res) => {
  try {
    const { name, email, phone, message, source } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({
        error: "Bad Request",
        details: "Send at least { name, email }"
      });
    }

    const lead = await Lead.create({
      name,
      email,
      phone,
      message,
      source: source || "website_form"
    });

    console.log("NEW LEAD:", lead);

    return res.json({
      success: true,
      message: "Lead saved",
      leadId: lead._id
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});

/* -------------------------------
   Start Server
--------------------------------*/
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});