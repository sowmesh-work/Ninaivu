# ninaivu — நினைவு

> A connected knowledge graph built for humans and AI alike.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind, Tiptap, React Flow |
| Backend | FastAPI, SQLAlchemy (async) |
| Database | PostgreSQL 16 + pgvector |
| State | Zustand, SWR |

---

## Getting started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Node.js 20+
- Python 3.12+

---

### 1. Start the database

```bash
cd ninaivu
docker compose up db -d
```

Wait for the health check to pass (~5 seconds). The `db/init.sql` script runs automatically and creates all tables + indexes.

---

### 2. Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # edit DATABASE_URL if needed
uvicorn app.main:app --reload
```

Backend is now running at **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

---

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend is now running at **http://localhost:3000**

---

## Project structure

```
ninaivu/
├── docker-compose.yml
├── db/
│   └── init.sql                  # Schema DDL (runs on first boot)
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI entry point
│   │   ├── config.py             # Settings (DATABASE_URL, OPENAI_API_KEY)
│   │   ├── database.py           # Async SQLAlchemy engine + session
│   │   ├── models/               # ORM models: Page, Block, Link, Chunk, Tag
│   │   └── api/routes/
│   │       └── pages.py          # CRUD + backlinks + search
│   └── requirements.txt
└── frontend/
    └── src/
        ├── app/                  # Next.js App Router
        ├── components/
        │   ├── sidebar/          # Page list + search
        │   ├── editor/           # Tiptap editor panel
        │   └── graph/            # Backlinks + graph panel
        ├── lib/
        │   ├── api.ts            # Typed API client
        │   └── store.ts          # Zustand global state
        └── types/                # Shared TypeScript types
```

---

## API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/pages/` | List all pages |
| POST | `/api/pages/` | Create a page |
| GET | `/api/pages/{id}` | Get a page with blocks |
| PUT | `/api/pages/{id}` | Update title / blocks |
| DELETE | `/api/pages/{id}` | Delete a page |
| GET | `/api/pages/search?q=` | Full-text title search |
| GET | `/api/pages/{id}/backlinks` | Pages that link to this one |

---

## What's next (Phase 2)

- `[[wiki link]]` autocomplete extension in Tiptap
- React Flow mini-graph in the right panel
- Semantic search via pgvector embeddings
- RAG query endpoint (`/api/rag/query`)
