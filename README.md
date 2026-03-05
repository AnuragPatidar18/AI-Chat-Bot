# AI Demo (Node + OpenAI)

## 1) Setup
```bash
npm install
```

## 2) Add your API key
Copy `.env.example` to `.env` and set your key:
```bash
# Windows (PowerShell)
copy .env.example .env
# macOS/Linux
cp .env.example .env
```

Edit `.env`:
```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

## 3) Run
```bash
npm start
```

Server: http://localhost:5000  
Chat endpoint: POST http://localhost:5000/chat

## 4) Quick test (Postman)
URL: `POST http://localhost:5000/chat`  
Body (raw JSON):
```json
{ "message": "Generate a website structure for a gym business" }
```

## 5) Frontend demo
Open `index.html` in browser (keep server running).
