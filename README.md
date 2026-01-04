# 🧠 AI Sales Brain - Marketing Automation Engine

A premium, multi-tenant SaaS platform designed to automate WhatsApp marketing with a 10-year experienced AI Sales persona.

## 🚀 Tech Stack

- **Frontend**: React + Vite + Tailwind CSS (Glassmorphic Design)
- **Backend**: Node.js + Express + Sequelize (MySQL)
- **AI Core**: GROQ (LLM) + Redis Stack (Vector Search / RAG)
- **OCR Service**: Python FastAPI + PaddleOCR (for extracting knowledge from images/PDFs)
- **Messaging**: WAHA (WhatsApp HTTP API) + BullMQ (Asynchronous Task Queuing)

## ✨ Core Features

- **Context-Aware AI**: Remembers the last 10 messages for a natural sales flow.
- **Human-Like Behavior**: Random 3-7 minute response delays to avoid bot detection.
- **RAG Knowledge Base**: Upload PDFs/TXTs to train your agent on your specific products.
- **Multi-Tenant Hub**: Manage multiple WhatsApp sessions and teams in one dashboard.
- **Sales Analytics**: Real-time tracking of lead accuracy and conversion performance.

## 🛠️ Quick Start (Docker)

1. Clone the repository.
2. Configure `.env` using `.env.example`.
3. Run `docker-compose up -d --build`.
4. Access the dashboard at `http://localhost:8080`.

## 📂 Project Structure

```text
├── .agent/              # AI Agent workspace and workflows
├── backend/            # Express API, Sequelize models & BullMQ Workers
│   ├── src/
│   │   ├── models/     # Database schemas (MySQL)
│   │   ├── services/   # Business logic (AI, Vector, WAHA)
│   │   └── routes/     # API Endpoints & Webhooks
├── blueprint/          # Technical Source of Truth (Topology, Architecture)
├── frontend/           # Vite + React + Tailwind v4 Dashboard
├── ocr/                # Python FastAPI + PaddleOCR Microservice
├── knowledgebase/      # Shared volume for document processing
├── progress/           # Daily progress logs by phase
├── summary/            # Session-based executive summaries
└── docker-compose.yml  # Multi-container orchestration
```

- **`/backend`**: The heart of the platform, managing RAG, Task Queues, and User sessions.
- **`/frontend`**: A premium glassmorphic dashboard for campaign and AI management.
- **`/ocr`**: Specialized OCR engine for extracting text from images/PDF knowledge sources.
- **`/blueprint`**: Essential documentation for maintaining the project's architectural integrity.

---
© 2026 Zevit Software. Built with Antigravity AI.
