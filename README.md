# 🕵️‍♂️ Crime Connect - Forensic Intelligence System

![Crime Connect Banner](https://img.shields.io/badge/Status-Production_Ready-cyan?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Neo4j](https://img.shields.io/badge/Neo4j-008CC1?style=for-the-badge&logo=neo4j&logoColor=white)
![Celery](https://img.shields.io/badge/celery-%2337814A.svg?style=for-the-badge&logo=celery&logoColor=white)

**Crime Connect** is a state-of-the-art, AI-powered forensic investigation platform designed to revolutionize how law enforcement and analysts process First Information Reports (FIRs) and case files. 

By leveraging cutting-edge Agentic Reasoning, Graph Databases, and Large Language Models, Crime Connect automatically reads case files, extracts critical entities, maps relationships across multiple cases, and provides an interactive "AI Detective" to interrogate the data.

---

## ✨ Core Features

* 📄 **Smart OCR Ingestion**: Automatically extracts high-accuracy text from uploaded FIR PDFs and documents using **Gemini 2.5 Flash**.
* 🧠 **Entity Extraction & Graph Mapping**: Uses **Groq (Llama 3)** to identify suspects, victims, weapons, locations, organizations, and dates. These are automatically mapped into a global **Neo4j Knowledge Graph**, instantly revealing connections between different crimes.
* 🤖 **AI Detective Chatbot**: A RAG-powered (Retrieval-Augmented Generation) assistant that interrogates the Graph and **ChromaDB** vector stores to answer complex investigative queries.
* ⏱️ **Dynamic Case Timelines**: Automatically generates chronological forensic timelines of events from unstructured case text.
* ⚡ **High-Concurrency Architecture**: Built on **FastAPI** with heavy LLM workloads offloaded to asynchronous **Celery** background workers via **Upstash Redis**.
* 🔒 **Secure Authentication**: Robust JWT and Google OAuth integration.

---

## 🏗️ System Architecture & Workflow

### 1. The Ingestion Pipeline
When a user uploads a new case file, the frontend instantly hands it to the FastAPI backend, which queues a background job in Celery.
1. **OCR (Gemini)**: Extracts raw text.
2. **Agentic Parsing (Groq)**: Identifies key entities via LangChain.
3. **Graph Storage (Neo4j)**: Nodes are merged dynamically. If "John Doe" is a suspect in Case A and a witness in Case B, the graph automatically connects the two cases.
4. **Vector Storage (ChromaDB)**: Document embeddings are stored for semantic search.

### 2. Global Deployment Architecture
The system is built for massive scale using a decoupled, serverless-friendly architecture:
* **Frontend**: Hosted on **Vercel** (Global Edge CDN).
* **Backend API**: Hosted on **Render Web Services** (FastAPI).
* **Background Workers**: Hosted on **Render Background Workers** (Celery).
* **Task Queue**: Managed by **Upstash Redis** (Serverless TLS).
* **Relational Database**: Managed by **Render PostgreSQL**.

---

## 💻 Technology Stack

### Frontend (Client Interface)
* **Framework**: React.js (Vite)
* **Styling**: Tailwind CSS, Framer Motion (Micro-animations)
* **Icons**: Lucide React
* **Routing**: React Router DOM

### Backend (Core API & Workers)
* **Framework**: FastAPI (Python)
* **Task Queue**: Celery
* **Authentication**: JWT / passlib / python-jose

### Databases & Storage
* **Relational**: PostgreSQL (SQLAlchemy + asyncpg)
* **Graph**: Neo4j (Cypher querying)
* **Vector**: ChromaDB
* **Broker**: Redis

### AI & Machine Learning
* **Models**: Groq (Llama 3), Google Gemini 2.5 Flash
* **Orchestration**: LangChain, LangGraph
* **Embeddings**: Sentence-Transformers (`all-MiniLM-L6-v2`)

---

## 🚀 Local Development Setup

### Prerequisites
* Python 3.11+
* Node.js 18+
* Docker & Docker Compose (for local Redis and PostgreSQL)
* Neo4j AuraDB (or local Neo4j Desktop)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # (On Windows: venv\Scripts\activate)
pip install -r requirements.txt
```

**Environment Variables** (Create `backend/.env`):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/crimeconnect
REDIS_URL=redis://localhost:6379/0
NEO4J_URI=neo4j+s://...
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=...
GROQ_API_KEY=...
GEMINI_API_KEY=...
```

**Run Local Infrastructure (Postgres/Redis)**:
```bash
docker-compose up -d
```

**Start the API Server & Celery Worker**:
```bash
# Terminal 1: FastAPI
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Celery
celery -A app.tasks.worker worker --loglevel=info
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

**Environment Variables** (Create `frontend/.env`):
```env
VITE_API_URL=http://localhost:8000
```

**Start the Development Server**:
```bash
npm run dev
```

---

## 🌍 Production Deployment

The project contains a comprehensive `.gitignore` configured to prevent secrets from leaking. 

1. **Vercel**: Connect your GitHub repository, set the framework to Vite, and set `VITE_API_URL` to your Render backend URL.
2. **Render Postgres**: Spin up a managed PostgreSQL database and copy the internal/external connection string.
3. **Upstash Redis**: Spin up a database, grab the `rediss://` TLS URL.
4. **Render Backend**: Connect the repo. 
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. **Render Worker**: Connect the repo as a Background Worker.
   - Start Command: `celery -A app.tasks.worker worker --loglevel=info`

---

## 🤝 Contributors
* **Anuj Parwal** (Lead Developer) - [LinkedIn](https://www.linkedin.com/in/anuj-parwal-805829283/) | [GitHub](https://github.com/anujparwal09)
* **Pradhyumn Jadhao** (Contributor) - [LinkedIn](https://www.linkedin.com/in/pradhyumn-jadhao-9064ab301/) | [GitHub](https://github.com/PradhyumnJadhao)

*Repository: [CRIME-CONNECT](https://github.com/anujparwal09/CRIME-CONNECT)*
