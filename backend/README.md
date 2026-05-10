# Crime-Connect AI Forensic Intelligence Backend

Production-grade FastAPI backend for an AI-powered criminal investigation system. Ingests FIR documents, extracts entities using LLMs, stores them as a knowledge graph, and answers investigator queries with AI reasoning.

## Architecture Overview

```
┌─────────────┐
│   Frontend  │ (React/Vue)
└──────┬──────┘
       │ HTTP/WebSocket
       ▼
┌─────────────────────────────────────────┐
│         FastAPI Backend (Port 8000)     │
├─────────────────────────────────────────┤
│ Routes:                                 │
│  • /api/auth      (Login/Register)      │
│  • /api/ingest    (FIR Upload)          │
│  • /api/graph     (Knowledge Graph)     │
│  • /api/chat      (AI Reasoning)        │
│  • /api/cases     (Case Management)     │
│  • /ws/logs       (Live Progress)       │
└────┬────────────┬────────────┬──────────┘
     │            │            │
     ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌──────────┐
│  Neo4j  │  │  Redis  │  │  Celery  │
│ (Graph) │  │(Cache)  │  │(Worker)  │
└────┬────┘  └─────────┘  └──────┬───┘
     │                           │
     └───────────────┬───────────┘
                     ▼
            ┌──────────────────┐
            │      Ollama      │
            │   (llama3 LLM)   │
            └──────────────────┘
```

## Tech Stack

- **API Framework**: FastAPI + Uvicorn
- **AI Orchestration**: LangChain + LangGraph
- **LLM Runtime**: Ollama (llama3 model)
- **Graph Database**: Neo4j
- **Vector Database**: ChromaDB
- **Cache/Broker**: Redis
- **Task Queue**: Celery
- **Authentication**: JWT + bcrypt
- **Environment**: Python 3.10+

## Quick Start

### Prerequisites

- Python 3.10 or higher
- Docker & Docker Compose (for infrastructure)
- ~4GB RAM minimum
- Optional local OCR dependencies for scanned PDFs:
  - Windows: Tesseract OCR (`choco install tesseract`)
  - Linux/Mac: `sudo apt install tesseract-ocr poppler-utils` or equivalent

### OCR Provider Configuration

You can choose which OCR backend to use with `OCR_PROVIDER`:
- `auto` (default): use selectable PDF text, then local Tesseract, then OCR.Space
- `local`: use only local Tesseract OCR
- `ocrspace`: use only OCR.Space

Set in `.env`:
```env
OCR_PROVIDER=auto
```

### Installation

1. **Clone the repository**
```bash
cd backend
```

2. **Start infrastructure**
```bash
docker-compose up -d
```

Verify services:
- Neo4j Browser: http://localhost:7474
- Redis: localhost:6379
- Ollama: http://localhost:11434

3. **Setup backed (Windows)**
```batch
startup.bat
```

Or **(Linux/Mac)**
```bash
chmod +x startup.sh
./startup.sh
```

This will:
- Create Python virtual environment
- Install all dependencies
- Create uploads directory

4. **Download LLM model**
```bash
docker exec crime-connect-ollama ollama pull llama3
```

5. **Start the API server**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

6. **In another terminal, start the Celery worker**
```bash
# Activate virtual environment first
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Start worker
celery -A app.tasks.worker worker --loglevel=info
```

7. **Access the APIs**
- API Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Root: http://localhost:8000

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.py          # Login/Register
│   │   │   ├── ingest.py        # FIR Upload
│   │   │   ├── graph.py         # Graph Queries
│   │   │   ├── chat.py          # AI Chat
│   │   │   └── cases.py         # Case Management
│   │   └── deps.py              # JWT Auth Dependency
│   ├── core/
│   │   ├── config.py            # Settings (from .env)
│   │   ├── security.py          # JWT + Password
│   │   └── database.py          # Neo4j Driver
│   ├── services/
│   │   ├── llm_service.py       # Ollama Integration
│   │   ├── neo4j_service.py     # Graph Queries
│   │   ├── ingestion_service.py # File Processing
│   │   ├── chroma_service.py    # Vector Search
│   │   └── entity_resolution.py # Deduplication
│   ├── agents/
│   │   ├── extraction_agent.py  # Entity Extraction
│   │   ├── graph_agent.py       # Graph Storage
│   │   ├── planner_agent.py     # Query Routing
│   │   └── reasoning_agent.py   # AI Reasoning
│   ├── tasks/
│   │   └── worker.py            # Celery Tasks
│   └── main.py                  # FastAPI App
├── .env                         # Environment Variables
├── docker-compose.yml           # Infrastructure
├── requirements.txt             # Dependencies
└── README.md                    # This file
```

## API Endpoints

### Authentication

**Register User**
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "investigator1",
  "email": "investigator@example.com",
  "password": "secure_password"
}
```

**Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "investigator@example.com",
  "password": "secure_password"
}

Response:
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

### File Ingestion

**Upload FIR**
```http
POST /api/ingest
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

file: @fir_document.pdf
```

**Check Processing Status**
```http
GET /api/ingest/status/{job_id}
Authorization: Bearer {access_token}
```

### Knowledge Graph

**Get Full Graph**
```http
GET /api/graph
Authorization: Bearer {access_token}
```

**Search Nodes**
```http
GET /api/graph/search?query=Raj_Kumar&label=Suspect
Authorization: Bearer {access_token}
```

**Get Connected Nodes**
```http
GET /api/graph/nodes/{node_id}/connected?depth=2
Authorization: Bearer {access_token}
```

### Chat & Reasoning

**Ask Question**
```http
POST /api/chat
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "query": "Who are the suspects in case XYZ?"
}

Response:
{
  "answer": "Based on the criminal intelligence graph...",
  "sources": [
    {
      "node_id": "123",
      "label": "Suspect",
      "properties": {"name": "Raj Kumar"}
    }
  ]
}
```

### Cases

**List Cases**
```http
GET /api/cases
Authorization: Bearer {access_token}
```

**Get Case Details**
```http
GET /api/cases/{case_id}
Authorization: Bearer {access_token}
```

## Entity Extraction Pipeline

```
1. File Upload (PDF/TXT)
   ↓
2. Text Extraction
   ↓
3. LLM Extraction (Ollama llama3)
   ├─ Suspects
   ├─ Victims
   ├─ Locations
   ├─ Weapons
   ├─ Dates
   └─ Organizations
   ↓
4. Entity Resolution (Deduplication)
   ↓
5. Neo4j Storage
   ├─ Create Nodes (by type)
   └─ Create Relationships
   ↓
6. Result to Client
```

## Environment Variables

Edit `.env` file:

```env
# App
APP_NAME=crime-connect
DEBUG=True
SECRET_KEY=your-super-secret-key

# JWT
ACCESS_TOKEN_EXPIRE_MINUTES=60
ALGORITHM=HS256

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=yourpassword

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Redis
REDIS_URL=redis://localhost:6379/0

# ChromaDB
CHROMA_PERSIST_DIR=./chroma_db

# CORS
FRONTEND_URL=http://localhost:5173
```

## WebSocket: Live Progress

Connect to `ws://localhost:8000/ws/logs` to receive real-time updates:

```json
{
  "stage": "extracting_entities",
  "progress": 40
}
```

Stages: `extracting_text` → `extracting_entities` → `storing_in_graph` → `completed`

## Testing

run tests:
```bash
pytest -v
pytest --cov=app  # With coverage
```

## Production Deployment

1. **Set DEBUG=False** in `.env`
2. **Use strong SECRET_KEY** (generate with `openssl rand -hex 32`)
3. **Configure proper database** (not in-memory)
4. **Use production ASGI server** (Gunicorn + Uvicorn)
5. **Enable HTTPS** (reverse proxy like Nginx)
6. **Configure authentication** (OAuth2, LDAP)
7. **Setup monitoring** (Prometheus, ELK)
8. **Enable logging** to persistent storage

Example Gunicorn start:
```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  app.main:app
```

## Security Considerations

- ✅ JWT tokens with expiration
- ✅ Bcrypt password hashing
- ✅ Parameterized Cypher queries (no injection)
- ✅ CORS configured to frontend only
- ✅ File upload validation (PDF/TXT only)
- ⚠️ TODO: Rate limiting
- ⚠️ TODO: API key rotation
- ⚠️ TODO: Audit logging
- ⚠️ TODO: Role-based access control

## Troubleshooting

### Neo4j Connection Failed
```
Check if Neo4j is running:
docker logs crime-connect-neo4j
```

### Redis Connection Failed
```
Check if Redis is running:
docker logs crime-connect-redis
```

### Ollama Model Not Found
```
Download the model first:
docker exec crime-connect-ollama ollama pull llama3
```

### Celery Tasks Not Running
```
Make sure Celery worker is started:
celery -A app.tasks.worker worker --loglevel=debug
```

## API Response Format

### Success Response
```json
{
  "data": {...},
  "status": "success"
}
```

### Error Response
```json
{
  "detail": "Error message",
  "status": "error"
}
```

## Performance Considerations

- **Graph Database**: Neo4j optimized for pattern matching
- **Vector Search**: ChromaDB for semantic similarity
- **Caching**: Redis speeds up repeated queries
- **Async**: FastAPI handles concurrent requests
- **Task Queue**: Celery processes heavy work asynchronously

## Future Enhancements

- [ ] Multi-language support (not just English)
- [ ] Advanced entity linking
- [ ] Graph pattern mining
- [ ] Anomaly detection
- [ ] User-defined rules engine
- [ ] Data export (CSV, PDF reports)
- [ ] Audit trail and compliance
- [ ] Advanced visualization
- [ ] Mobile APIs

## License

Proprietary - Crime-Connect Project

## Support

For issues and questions, check the documentation or contact the development team.

---

**Last Updated**: 2026-04-03
**Backend Version**: 1.0.0
