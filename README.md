# VectorShift Pipeline Builder

> A production-grade visual AI workflow editor — drag-and-drop node canvas, real-time DAG validation, topological pipeline execution, and a hardened FastAPI backend with SSRF + ReDoS protection.

<div align="center">

![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white&style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white&style=flat-square)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white&style=flat-square)
![Zustand](https://img.shields.io/badge/Zustand-5.0-FF6B35?style=flat-square)
![Vitest](https://img.shields.io/badge/Vitest-3.0-729B1B?logo=vitest&logoColor=white&style=flat-square)
![Pytest](https://img.shields.io/badge/Pytest-8.3-0A9EDC?logo=pytest&logoColor=white&style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white&style=flat-square)

</div>

---

## What This Is

This is a complete submission for the **VectorShift Frontend Technical Assessment**, built by **Manoj RS**. It is a visual pipeline builder — think a lightweight, local version of VectorShift's no-code AI workflow product — where users can:

- Drag and connect typed nodes onto a canvas to describe a data flow
- Execute the pipeline against a FastAPI backend that runs nodes in topological order
- Validate DAG structure (cycle detection) both client-side and server-side
- Build AI workflows using a real Gemini API integration with Google Search grounding

The codebase is structured as a decoupled monorepo: a **React 19 + TypeScript** frontend and a **Python 3.12 + FastAPI** backend, both containerised.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Frontend  :3000                       │
│                                                                 │
│  ┌──────────┐   drag/drop   ┌──────────────────────────────┐   │
│  │ Toolbar  │ ────────────► │   ReactFlow Canvas           │   │
│  │ (9 types)│               │   (Controlled Mode)          │   │
│  └──────────┘               └──────────┬─────────────────── ┘   │
│                                        │                        │
│                              ┌─────────▼──────────┐            │
│                              │  Zustand Store      │            │
│                              │  • nodes / edges    │            │
│                              │  • undo / redo      │            │
│                              │  • execution states │            │
│                              │  • localStorage     │            │
│                              └─────────┬──────────┘            │
│                                        │                        │
│               client-side DAG check    │  POST /pipelines/parse │
│               (instant, no network)    │  POST /api/validate    │
│                                        │  POST /api/run         │
└────────────────────────────────────────┼────────────────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────────┐
│                     FastAPI Backend  :8000                       │
│                                                                  │
│  POST /pipelines/parse ──► validate_pipeline()                  │
│  POST /api/pipelines/validate ──► validate_pipeline()           │
│  POST /api/pipelines/run ──► execute_pipeline()                 │
│  GET  /api/health                                               │
│  GET  /docs  ◄── Swagger UI (root / redirects here)            │
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ NetworkX DiGraph│    │ Execution Engine │                    │
│  │ DAG validation  │    │ Topological sort │                    │
│  │ Cycle detection │    │ Node-by-node run │                    │
│  └─────────────────┘    └────────┬────────┘                    │
│                                  │                              │
│            ┌─────────────────────▼──────────────────┐          │
│            │  Security Layer                         │          │
│            │  • SSRF: DNS → IP range check           │          │
│            │  • ReDoS: multiprocessing isolation     │          │
│            │  • Gemini key in x-goog-api-key header  │          │
│            └─────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Python | ≥ 3.12 |
| Docker + Docker Compose | Optional (recommended) |

---

### Option A — Docker (Recommended)

```bash
# Clone / unzip the project, then:
cd vector-sub/app
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

---

### Option B — Manual

#### Backend

```bash
cd vector-sub/app/backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt

# Optional: add Gemini API key for real LLM execution
echo "GEMINI_API_KEY=your_key_here" > .env

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
cd vector-sub/app
npm install
npm run dev
# Starts on http://localhost:3000
```

> **CORS note:** The backend accepts requests from `localhost:3000` and `localhost:5173` by default. To change this, set `CORS_ORIGINS=http://yourdomain.com` in `backend/.env`.

---

## Running Tests

### Backend (Pytest)

```bash
cd vector-sub/app/backend
source venv/bin/activate   # or Windows equivalent
pytest tests/ -v
```

Expected output:
```
tests/test_dag.py::test_empty_pipeline           PASSED
tests/test_dag.py::test_linear_pipeline_is_dag   PASSED
tests/test_dag.py::test_cycle_detected           PASSED
tests/test_dag.py::test_branching_dag            PASSED
tests/test_dag.py::test_self_loop                PASSED
tests/test_dag.py::test_disconnected_nodes       PASSED
tests/test_execution.py::test_execute_simple_chain             PASSED
tests/test_execution.py::test_execute_text_variable_replacement PASSED
tests/test_execution.py::test_execute_transform_node           PASSED
...
```

### Frontend (Vitest)

```bash
cd vector-sub/app
npm test
```

---

## Node Reference

| Node | Colour | Inputs | Outputs | Description |
|---|---|:---:|:---:|---|
| **Input** | `#3b82f6` Blue | 0 | 1 | Named text/file source with configurable type |
| **Output** | `#22c55e` Green | 1 | 0 | Displays final pipeline result |
| **LLM** | `#a855f7` Purple | 2 (`system`, `prompt`) | 1 | Model config: gpt-4o, claude-3-5-sonnet, gemini-1.5-flash |
| **Text** | `#f97316` Orange | Dynamic | 1 | Template engine — `{{variable}}` creates live handles |
| **Transform** | `#6366f1` Indigo | 1 | 1 | Uppercase / lowercase / trim / JSON parse / slugify |
| **Merge** | `#ec4899` Pink | 3 | 1 | Combine inputs: concat / object merge / join |
| **Filter** | `#ef4444` Red | 1 | 1 | Conditional pass: contains / regex / equals / gt / lt |
| **API** | `#06b6d4` Cyan | 1 | 1 | HTTP call — GET/POST/PUT/DELETE/PATCH with headers + body |
| **Delay** | `#eab308` Yellow | 1 | 1 | Introduce a timed pause: ms / seconds / minutes |

---

## Key Features

### Part 1 — Node Abstraction
All 9 node types extend a single `BaseNode` component driven by a `NODE_CONFIGS` registry. Adding a new node type requires:
1. One entry in `NODE_CONFIGS` (label, colour, input/output counts, default data)
2. One small component that renders `<BaseNode {...props}>` with its fields
3. One line in `nodeRegistry.ts`

No duplicated layout code, no copy-paste containers.

### Part 2 — Styling
- **Concentric bezel design**: frosted-glass outer shell + solid inner card with per-type left accent stripe
- **Dark / Light mode**: `D` key toggle, persisted in localStorage
- **Execution state glow**: nodes pulse yellow (running), green (success), red (error/cycle)
- **Framer Motion** throughout: node creation, modal springs, delete button fade
- **Empty canvas onboarding**: animated 3-step card when canvas is empty

### Part 3 — Text Node Logic
```
User types: "Hello {{name}}, you have {{count}} messages"
                        ↓
extractVariables() → ["name", "count"]
                        ↓
Two target handles mount on left side, labelled "name" and "count"
Node width expands with longest line length (max 450px)
Node height expands with textarea scrollHeight (max 200px)
```

Regex: `/\{\{\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\}\}/g` — fully compliant with JS identifier rules including `$` prefix.

### Part 4 — Backend Integration

**Endpoint (as specified):**
```http
POST /pipelines/parse
Content-Type: application/json

{
  "nodes": [...],
  "edges": [...]
}

→ { "num_nodes": 4, "num_edges": 3, "is_dag": true }
```

**Algorithm:** NetworkX `is_directed_acyclic_graph()` — O(V+E), handles disconnected subgraphs, returns cycle node list for UI highlighting.

**Frontend:** Framer Motion spring-animated modal displays results. No `window.alert()` used anywhere.

---

## Security Architecture

### SSRF Protection (API Node)
Before any outbound HTTP request from the API node, the URL is validated:
1. Scheme must be `http` or `https`
2. Hostname resolved to IP via `socket.getaddrinfo()`
3. IP checked against: loopback, private, link-local, multicast, reserved, unspecified ranges
4. Any match → request blocked with 400 validation error

```python
# services.py
ip = ipaddress.ip_address(ip_str)
if ip.is_loopback or ip.is_private or ip.is_link_local or ...:
    raise ValueError("SSRF: private/local address blocked")
```

### ReDoS Protection (Filter Node)
User-supplied regex patterns are executed in an isolated subprocess with a hard timeout:
- Pattern length cap: 100 characters
- Input text length cap: 1000 characters
- Execution via `multiprocessing.Process` with `process.join(timeout=1.0)`
- If alive after timeout: `process.terminate()` — server CPU is never blocked

```python
# services.py
process = ctx.Process(target=_regex_worker, args=(pattern, text, queue))
process.start()
process.join(timeout=timeout)
if process.is_alive():
    process.terminate()
    raise ValueError("Regex execution timed out (potential ReDoS)")
```

### Gemini API Key Security
API key transmitted in `x-goog-api-key` HTTP header — never in query string parameters, never in URLs that appear in server access logs.

---

## State Management

```
Zustand Store (single source of truth)
├── nodes[]              ← ReactFlow controlled mode
├── edges[]              ← ReactFlow controlled mode
├── history[]            ← 50-entry snapshot stack (deep clone)
├── historyIndex         ← current position for undo/redo
├── selectedNodeId
├── nodeExecutionStates  ← idle | running | success | error
├── cycleNodes[]         ← highlighted on canvas
├── isDarkMode           ← persisted to localStorage
└── hasOnboarded         ← persisted to localStorage
```

**Undo/Redo:** Every mutating action calls `_saveToHistory()` before applying changes. `undo()` / `redo()` navigate the snapshot array. Keyboard: `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y`.

**Persistence:** Pipeline state auto-saves to `localStorage` every 3 seconds via `useAutoSave` hook. Survives page refresh.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |
| `Ctrl + S` | Export pipeline as JSON |
| `Ctrl + O` | Import pipeline from JSON |
| `Ctrl + K` | Toggle node search |
| `D` | Toggle dark / light mode |
| `?` | Show keyboard shortcuts modal |
| `Delete` / `Backspace` | Delete selected node |
| `Esc` | Close modal |

---

## Project Structure

```
vector-sub/app/
├── src/
│   ├── components/
│   │   ├── nodes/
│   │   │   ├── BaseNode.tsx          # Abstract base — all nodes extend this
│   │   │   ├── InputNode.tsx
│   │   │   ├── OutputNode.tsx
│   │   │   ├── LLMNode.tsx
│   │   │   ├── TextNode.tsx          # Auto-resize + {{variable}} handles
│   │   │   ├── TransformNode.tsx
│   │   │   ├── MergeNode.tsx
│   │   │   ├── FilterNode.tsx        # ReDoS-protected regex UI
│   │   │   ├── APINode.tsx           # SSRF-protected HTTP caller
│   │   │   ├── DelayNode.tsx
│   │   │   └── nodeRegistry.ts       # NodeType → Component map
│   │   ├── PipelineCanvas.tsx        # ReactFlow controlled mode, action bar
│   │   ├── Toolbar.tsx               # Node palette + search
│   │   ├── PropertiesPanel.tsx       # Slide-in node inspector
│   │   ├── OnboardingTutorial.tsx    # First-launch guided tour
│   │   └── KeyboardShortcutsModal.tsx
│   ├── store/
│   │   └── pipelineStore.ts          # Zustand store (nodes, edges, history)
│   ├── types/
│   │   ├── node.types.ts             # NodeType, NODE_CONFIGS, all data interfaces
│   │   ├── pipeline.types.ts
│   │   └── api.types.ts
│   ├── utils/
│   │   ├── variableParser.ts         # {{variable}} regex extraction
│   │   ├── dagValidation.ts          # Client-side DFS cycle check
│   │   └── constants.ts              # NODE_COLORS, API_BASE_URL
│   ├── hooks/
│   │   └── useAutoSave.ts            # localStorage persistence (3s debounce)
│   ├── test/
│   │   ├── unit.test.ts              # Variable parser + DAG validation
│   │   ├── components.test.tsx       # BaseNode + TextNode rendering
│   │   └── setup.ts                  # ResizeObserver mock for JSDOM
│   └── submit.tsx                    # Submit Pipeline modal
│
├── backend/
│   ├── main.py                       # FastAPI app + /pipelines/parse endpoint
│   ├── app/
│   │   ├── router.py                 # /api prefix: validate, run, health
│   │   ├── models.py                 # Pydantic: PipelineRequest, PipelineNode
│   │   └── services.py               # validate_pipeline, execute_pipeline
│   │                                 # SSRF check, ReDoS isolation, Gemini call
│   ├── tests/
│   │   ├── test_dag.py               # 6 DAG validation tests
│   │   └── test_execution.py         # 8 execution + security tests
│   └── requirements.txt
│
├── Dockerfile                        # Frontend container
├── backend/Dockerfile                # Backend container (no --reload)
└── docker-compose.yml                # Full-stack orchestration
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Google Gemini API key for real LLM execution. Falls back to DuckDuckGo search scraping if absent. |
| `CORS_ORIGINS` | Optional | Comma-separated allowed origins. Defaults to `localhost:3000,localhost:5173`. |

### Frontend (`app/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Optional | Backend base URL. Defaults to `http://localhost:8000`. |

---

## API Reference

### `POST /pipelines/parse`
*Assessment-specified endpoint. Returns minimal DAG analysis.*

**Request:**
```json
{
  "nodes": [{ "id": "n1", "type": "input", "position": {"x": 0, "y": 0}, "data": {} }],
  "edges": [{ "id": "e1", "source": "n1", "target": "n2" }]
}
```

**Response:**
```json
{ "num_nodes": 2, "num_edges": 1, "is_dag": true }
```

---

### `POST /api/pipelines/validate`
*Extended validation with cycle node identification.*

**Response:**
```json
{
  "num_nodes": 3,
  "num_edges": 3,
  "is_dag": false,
  "cycle_nodes": ["node_a", "node_b"],
  "message": "Cycle detected involving: ['node_a', 'node_b']"
}
```

---

### `POST /api/pipelines/run`
*Full topological execution. Returns per-node output values.*

**Response:**
```json
{
  "success": true,
  "execution_order": ["n1", "n2", "n3"],
  "node_updates": {
    "n2": { "outputValue": "Hello Alice!" },
    "n3": { "outputValue": "HELLO ALICE!" }
  }
}
```

---

### `GET /api/health`
```json
{ "status": "ok", "service": "VectorShift Pipeline API" }
```

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend Framework | React | 19.2 | UI rendering |
| Canvas | @xyflow/react | 12.11 | Node-based DAG canvas |
| State | Zustand | 5.0 | Single-source-of-truth store |
| Animation | Framer Motion | 12.40 | Spring animations, modals |
| Icons | Lucide React | 0.562 | UI iconography |
| Styling | Tailwind CSS | 3.4 | Utility-first CSS |
| Language (FE) | TypeScript | 5.9 | Type safety |
| Bundler | Vite | 7.2 | Dev server + production build |
| Frontend Tests | Vitest + Testing Library | 3.0 | Unit + component tests |
| Backend Framework | FastAPI | 0.115 | REST API |
| Graph Engine | NetworkX | 3.3 | DAG validation + topological sort |
| HTTP Client | httpx | 0.27 | Async outbound API calls |
| Language (BE) | Python | 3.12 | Backend runtime |
| Backend Tests | Pytest | 8.3 | Test suite |
| Validation | Pydantic | 2.10 | Request/response models |

---

## Candidate

**Manoj RS** — B.E. Electronics & Communication, VVCE Mysuru (2022–2026).

- **GitHub:** [github.com/Manoj-0810](https://github.com/Manoj-0810)
- **Portfolio:** [my-portfolio-manoj-008.vercel.app](https://my-portfolio-manoj-008.vercel.app/)
- **LinkedIn:** [linkedin.com/in/manoj-r-s-644560275](https://www.linkedin.com/in/manoj-r-s-644560275/)

---
