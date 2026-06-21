# VectorShift Pipeline Builder

> A visual AI workflow editor — drag-and-drop node canvas with client- and server-side DAG validation, topological pipeline execution against a FastAPI backend, and a real (not mocked) Gemini integration with an SSRF-guarded API node and a ReDoS-isolated regex filter.

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

## Demo

🎥 **Walkthrough video:** [loom.com/share/6aff54a7c10a41f18cd92376f2670893](https://www.loom.com/share/6aff54a7c10a41f18cd92376f2670893)

---

## What This Is

This is a submission for the **VectorShift Frontend Technical Assessment**, built by **Manoj RS**. It's a visual pipeline builder — a lightweight, local analogue of VectorShift's no-code AI workflow product — where you can:

- Drag and connect typed nodes onto a canvas to describe a data flow
- Execute the pipeline against a FastAPI backend that runs nodes in topological order, with a live Gemini API call behind the LLM node
- Validate DAG structure (cycle detection) both client-side (instant, no network round trip) and server-side (authoritative, via NetworkX)
- Build pipelines with all four assessment parts: node abstraction, styling, Text-node variable parsing, and backend integration

The codebase is a decoupled two-service project: a **React 19 + TypeScript** frontend and a **Python 3.12 + FastAPI** backend, both containerised independently.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     React Frontend  :3000                        │
│                                                                    │
│  ┌──────────┐   drag/drop   ┌──────────────────────────────┐     │
│  │ Toolbar  │ ────────────► │   ReactFlow Canvas            │     │
│  │ (9 types)│               │   (Controlled Mode)           │     │
│  └──────────┘               └──────────┬─────────────────── ┘     │
│                                         │                          │
│                               ┌─────────▼──────────┐               │
│                               │  Zustand Store      │               │
│                               │  • nodes / edges    │               │
│                               │  • undo / redo       │               │
│                               │  • execution states  │               │
│                               │  • debounced         │               │
│                               │    localStorage save │               │
│                               └─────────┬──────────┘               │
│                                         │                          │
│         client-side DAG pre-check       │  POST /pipelines/parse   │
│         (skips network on cycle)        │  POST /api/pipelines/validate │
│                                         │  POST /api/pipelines/run │
└─────────────────────────────────────────┼──────────────────────────┘
                                          │
┌──────────────────────────────────────────▼────────────────────────┐
│                     FastAPI Backend  :8000                         │
│                                                                     │
│  POST /pipelines/parse           ──► validate_pipeline()           │
│  POST /api/pipelines/validate    ──► validate_pipeline()           │
│  POST /api/pipelines/run         ──► execute_pipeline()            │
│  GET  /api/health                                                  │
│  GET  /docs   ◄── Swagger UI (root "/" redirects here)             │
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────────┐                  │
│  │ NetworkX DiGraph  │    │ Execution Engine       │                  │
│  │ DAG validation    │    │ Topological sort       │                  │
│  │ Cycle detection    │    │ Node-by-node handlers  │                  │
│  └──────────────────┘    └──────────┬────────────┘                  │
│                                     │                                │
│             ┌───────────────────────▼─────────────────┐             │
│             │  Security Layer                          │             │
│             │  • SSRF: DNS resolve → private/reserved   │             │
│             │    IP range check before any API-node call│             │
│             │  • ReDoS: regex isolated in a              │             │
│             │    multiprocessing worker, hard timeout    │             │
│             │  • Gemini key sent via x-goog-api-key      │             │
│             │    header, never in a URL/query string     │             │
│             └─────────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────────────┘
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
# Unzip the project, then from its root:
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

The backend container runs without `--reload` by default (a safe production default); `docker-compose` overrides this with a hot-reload command for local dev convenience, since it already bind-mounts `./backend`.

---

### Option B — Manual

#### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt

# Optional: add a Gemini API key for real LLM execution
cp .env.example .env
# then edit .env and set GEMINI_API_KEY

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Without a `GEMINI_API_KEY`, the LLM node still runs — it falls back to scraping DuckDuckGo's HTML search results for a live-ish answer, with a clear "Mock Mode" notice in the output if even that's unavailable. The pipeline never silently does nothing.

#### Frontend

```bash
npm install
npm run dev
# Starts on http://localhost:3000
```

> **CORS note:** the backend reads `CORS_ORIGINS` from the environment (see `backend/main.py`) and defaults to `localhost:3000,localhost:5173` if unset. Set `CORS_ORIGINS=http://yourdomain.com` in `backend/.env` to change it — this isn't just documented, the code actually reads it.

---

## Running Tests

### Backend (Pytest) — 14 tests

```bash
cd backend
source venv/bin/activate   # or Windows equivalent
pytest tests/ -v
```

```
tests/test_dag.py::test_empty_pipeline                PASSED
tests/test_dag.py::test_linear_pipeline_is_dag         PASSED
tests/test_dag.py::test_cycle_detected                 PASSED
tests/test_dag.py::test_self_loop                      PASSED
tests/test_dag.py::test_complex_dag                     PASSED
tests/test_dag.py::test_complex_cycle                   PASSED
tests/test_execution.py::test_execute_simple_chain                PASSED
tests/test_execution.py::test_execute_text_variable_replacement   PASSED
tests/test_execution.py::test_execute_transform_node               PASSED
tests/test_execution.py::test_execute_merge_node                   PASSED
tests/test_execution.py::test_execute_filter_node                  PASSED
tests/test_execution.py::test_redos_protection                     PASSED
tests/test_execution.py::test_ssrf_protection                      PASSED
tests/test_execution.py::test_api_endpoints_with_test_client        PASSED
```

`test_ssrf_protection` resolves real DNS (`google.com`, `localhost`, etc.), so it needs outbound network access to pass — that's intentional, it's testing the actual resolution path, not a mock of it.

### Frontend (Vitest) — 7 tests

```bash
npm test
```

Covers `extractVariables()` regex parsing, the client-side DAG validator (simple DAG, simple cycle, self-loop, topological order), and component rendering for `BaseNode` and `TextNode` (including dynamic `{{variable}}` handle creation).

---

## Node Reference

| Node | Colour | Inputs | Outputs | Description |
|---|---|:---:|:---:|---|
| **Input** | `#3b82f6` Blue | 0 | 1 | Named text/file source |
| **Output** | `#22c55e` Green | 1 | 0 | Displays final pipeline result |
| **LLM** | `#a855f7` Purple | 2 (`system`, `prompt`) | 1 | Model picker + temperature; execution calls Gemini (see [Known Limitations](#known-limitations--honest-notes)) |
| **Text** | `#f97316` Orange | Dynamic | 1 | Template engine — `{{variable}}` creates live handles |
| **Transform** | `#6366f1` Indigo | 1 | 1 | uppercase / lowercase / trim / reverse / slugify / json_parse / json_stringify |
| **Merge** | `#ec4899` Pink | 3 | 1 | concat / join_comma / join_newline / object_merge / array_merge |
| **Filter** | `#ef4444` Red | 1 | 1 | contains / equals / starts_with / ends_with / greater_than / less_than / regex |
| **API** | `#06b6d4` Cyan | 1 | 1 | HTTP call — GET/POST/PUT/PATCH/DELETE, SSRF-checked before every request |
| **Delay** | `#eab308` Yellow | 1 | 1 | Pause execution — ms / seconds / minutes, server-side capped at 5s |

---

## Key Features

### Part 1 — Node Abstraction
All 9 node types extend a single `BaseNode` component driven by a `NODE_CONFIGS` registry (`src/types/node.types.ts`). Adding a new node type means:
1. One entry in `NODE_CONFIGS` (label, colour, input/output counts, default data)
2. One small component that renders `<BaseNode {...props}>` with its own fields
3. One line in `nodeRegistry.ts`

No duplicated layout code. Fixed-input nodes (LLM, Merge, etc.) get labelled handles with hover tooltips, not anonymous dots.

### Part 2 — Styling
- Concentric bezel design: frosted-glass outer shell + solid inner card with a per-type left accent stripe
- Dark / light mode (`D` key), persisted to localStorage
- Execution-state glow: nodes pulse yellow (running), green (success), red (error/cycle)
- Framer Motion throughout — node creation, modal springs, delete fades
- Empty-canvas onboarding tutorial on first launch

### Part 3 — Text Node Logic
```
User types: "Hello {{name}}, you have {{count}} messages"
                        ↓
extractVariables() → ["name", "count"]
                        ↓
Two target handles mount on the left, labelled "name" and "count"
```
Regex: `/\{\{\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\}\}/g` — valid per JS identifier rules, including a `$` prefix.

Renaming or deleting a `{{variable}}` doesn't just hide its handle — the store also prunes any edge that was wired to it, so you can't end up with a connection pointing at a handle that no longer exists.

### Part 4 — Backend Integration

**Endpoint (as specified):**
```http
POST /pipelines/parse
Content-Type: application/json

{ "nodes": [...], "edges": [...] }

→ { "num_nodes": 4, "num_edges": 3, "is_dag": true }
```

**Algorithm:** `networkx.is_directed_acyclic_graph()` plus `networkx.find_cycle()` for the offending node list — O(V+E), handles disconnected subgraphs.

**Frontend:** a Framer Motion spring-animated modal shows the result. No `window.alert()` anywhere in the app.

The "Validate" button runs the same DFS-based check client-side first (`src/utils/dagValidation.ts`); if a cycle is already detectable locally, it shows the result immediately and skips the network call entirely. If the graph looks valid, it still confirms against the backend as the source of truth.

---

## Security Architecture

### SSRF Protection (API Node)
Before any outbound request from the API node:
1. Scheme must be `http` or `https`
2. Hostname is resolved via `socket.getaddrinfo()`
3. Every resolved IP is checked against loopback / private / link-local / multicast / reserved / unspecified ranges
4. Any match → request blocked, 400 returned

```python
# backend/app/services.py
ip = ipaddress.ip_address(ip_str)
if ip.is_loopback or ip.is_private or ip.is_link_local or ...:
    return False  # blocked
```

**Known limitation, stated plainly:** this is a point-in-time DNS check, not a pinned connection. A sufficiently adversarial DNS server could in theory rebind the hostname between the check and the actual request (a TOCTOU/"DNS rebinding" attack). Closing that gap fully means connecting directly to the validated IP with the original Host header/SNI, or routing egress through a proxy with its own allowlist — meaningful infrastructure-layer work that's out of scope for an app-level check like this one. What's here blocks the overwhelming majority of naive SSRF attempts (literal loopback/private/link-local URLs), which is the threat model it's actually addressing.

### ReDoS Protection (Filter Node)
User-supplied regex patterns never run in the main process:
- Pattern capped at 100 characters, input text capped at 1000 characters
- Executed via `multiprocessing.Process` with `process.join(timeout=1.0)`
- Still alive after timeout → `process.terminate()`; the server's event loop is never blocked by catastrophic backtracking

```python
# backend/app/services.py
process = ctx.Process(target=_regex_worker, args=(pattern, text, queue))
process.start()
process.join(timeout=timeout)
if process.is_alive():
    process.terminate()
    raise ValueError("Regex matching timed out")
```

### Gemini API Key
Sent via the `x-goog-api-key` HTTP header — never in a query string, never in a URL that could end up in server access logs.

---

## State Management

```
Zustand Store (single source of truth) — src/store/pipelineStore.ts
├── nodes[] / edges[]      ← ReactFlow controlled mode
├── history[]              ← 50-entry deep-clone snapshot stack
├── historyIndex
├── selectedNodeId
├── nodeExecutionStates    ← idle | running | success | error
├── cycleNodes[]           ← highlighted on canvas
├── isDarkMode             ← persisted
└── hasOnboarded           ← persisted
```

**Undo/redo:** discrete actions (add/delete node, connect, import, reset) commit a history entry immediately. Continuous edits (typing in a node) are debounced into a single undo step 800ms after you stop, so editing a sentence doesn't produce one undo step per keystroke. `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y`.

**Persistence:** writes to `localStorage` are debounced (600ms after the last change), not synchronous on every keystroke or drag frame — dragging a node fires `onNodesChange` on every pointer-move, and serializing the whole pipeline on every one of those would be wasteful. In-memory state still updates instantly; only the disk write is delayed. A `beforeunload` listener flushes any pending write immediately if you close the tab mid-debounce, so you can't lose the last few seconds of edits.

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

## Known Limitations / Honest Notes

A few things worth being upfront about rather than letting a reviewer discover them:

- **LLM node model picker is cosmetic.** The dropdown offers `gpt-4o`, `gpt-4o-mini`, `claude-3-5-sonnet-20241022`, `gemini-1.5-flash`, `gemini-1.5-pro`, but execution always calls Gemini 1.5 Flash server-side regardless of selection (`backend/app/services.py::execute_llm_node`). Real multi-provider routing (actually calling OpenAI/Anthropic depending on the selected model) is the natural next step, not yet built.
- **SSRF protection has a residual DNS-rebinding gap** — see the Security Architecture section above for specifics. It's a real, documented limitation, not an oversight.
- **The no-API-key fallback scrapes DuckDuckGo's HTML search page** with a regex, which is inherently fragile — if DuckDuckGo changes their markup, the fallback degrades to the explicit "Mock Mode" message rather than failing silently. It's a reasonable demo fallback, not something to depend on.
- **Delay node is capped at 5 seconds server-side** regardless of what's configured, to prevent a misconfigured or malicious delay from tying up a worker indefinitely.

---

## Project Structure

```
.
├── src/
│   ├── components/
│   │   ├── nodes/
│   │   │   ├── BaseNode.tsx          # All nodes render through this
│   │   │   ├── InputNode.tsx / OutputNode.tsx
│   │   │   ├── LLMNode.tsx
│   │   │   ├── TextNode.tsx          # Auto-resize + {{variable}} handles
│   │   │   ├── TransformNode.tsx / MergeNode.tsx / FilterNode.tsx
│   │   │   ├── APINode.tsx           # SSRF-checked HTTP caller
│   │   │   ├── DelayNode.tsx
│   │   │   └── nodeRegistry.ts       # NodeType → Component map
│   │   ├── PipelineCanvas.tsx        # ReactFlow controlled mode, action bar
│   │   ├── Toolbar.tsx               # Node palette + search
│   │   ├── PropertiesPanel.tsx       # Slide-in node inspector
│   │   ├── OnboardingTutorial.tsx
│   │   ├── KeyboardShortcutsModal.tsx
│   │   └── ErrorBoundary.tsx
│   ├── store/pipelineStore.ts        # Zustand store
│   ├── types/
│   │   ├── node.types.ts             # NodeType, NODE_CONFIGS, data interfaces
│   │   └── api.types.ts              # Typed DTOs for every backend response
│   ├── utils/
│   │   ├── variableParser.ts         # {{variable}} regex extraction
│   │   ├── dagValidation.ts          # Client-side DFS cycle check + toposort
│   │   └── constants.ts
│   ├── test/                         # Vitest: unit.test.ts, components.test.tsx
│   └── submit.tsx                    # Submit Pipeline modal (calls /pipelines/parse)
│
├── backend/
│   ├── main.py                       # FastAPI app, CORS from env, /pipelines/parse
│   ├── app/
│   │   ├── router.py                 # /api prefix: validate, run, health
│   │   ├── models.py                 # Pydantic request/response models
│   │   └── services.py               # validate_pipeline, execute_pipeline,
│   │                                  # SSRF check, ReDoS isolation, Gemini call
│   ├── tests/test_dag.py / test_execution.py
│   └── requirements.txt
│
├── Dockerfile                        # Frontend container (multi-stage, nginx)
├── backend/Dockerfile                # Backend container (no --reload by default)
└── docker-compose.yml                # Full-stack orchestration
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Google AI Studio key for real LLM execution. Falls back to a DuckDuckGo-scraped "mock mode" answer if absent. |
| `CORS_ORIGINS` | Optional | Comma-separated allowed origins. Defaults to `localhost:3000,localhost:5173`. Actually read by `main.py`, not just documented. |

### Frontend (`.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Optional | Backend base URL. Defaults to `http://localhost:8000`. |

> Don't put `GEMINI_API_KEY` in the frontend `.env` — anything prefixed `VITE_` is compiled into the public browser bundle, which would leak a real key to anyone viewing page source. It belongs in `backend/.env` only, where it's sent server-side via a header.

---

## API Reference

### `POST /pipelines/parse`
*Assessment-specified endpoint. Returns minimal DAG analysis.*

```json
// Request
{
  "nodes": [{ "id": "n1", "type": "input", "position": {"x": 0, "y": 0}, "data": {} }],
  "edges": [{ "id": "e1", "source": "n1", "target": "n2" }]
}

// Response
{ "num_nodes": 2, "num_edges": 1, "is_dag": true }
```

### `POST /api/pipelines/validate`
*Extended validation with cycle node identification.*

```json
{
  "num_nodes": 3,
  "num_edges": 3,
  "is_dag": false,
  "cycle_nodes": ["node_a", "node_b"],
  "message": "Cycle detected involving: ['node_a', 'node_b']"
}
```

### `POST /api/pipelines/run`
*Full topological execution. Returns the actual execution order and per-node output values.*

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

### `GET /api/health`
```json
{ "status": "ok", "version": "1.0.0" }
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
| Backend Tests | Pytest + anyio | 8.3 | Test suite, incl. async tests |
| Validation | Pydantic | ≥ 2.10 | Request/response models |

---

## Candidate

**Manoj RS** — B.E. Electronics & Communication, VVCE Mysuru (2022–2026).

- **GitHub:** [github.com/Manoj-0810](https://github.com/Manoj-0810)
- **Portfolio:** [my-portfolio-manoj-008.vercel.app](https://my-portfolio-manoj-008.vercel.app/)
- **LinkedIn:** [linkedin.com/in/manoj-r-s-644560275](https://www.linkedin.com/in/manoj-r-s-644560275/)

---
