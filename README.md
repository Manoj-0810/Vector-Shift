<div align="center">

<br/>

<img src="https://img.shields.io/badge/⚡-VectorShift%20Pipeline%20Builder-6366F1?style=for-the-badge&labelColor=0F1117&color=6366F1" height="40"/>

<br/><br/>

<p>
  A visual, production-hardened AI workflow editor — drag-and-drop DAG canvas,<br/>
  dual-layer cycle detection, topological execution engine, and a hardened FastAPI backend.<br/>
  Built as the VectorShift Frontend Technical Assessment by <strong>Manoj RS</strong>.
</p>

<br/>

<a href="https://www.loom.com/share/6aff54a7c10a41f18cd92376f2670893">
  <img src="https://img.shields.io/badge/▶%20Watch%20Demo%20Walkthrough-Loom-00897B?style=for-the-badge&logo=loom&logoColor=white" alt="Watch the demo"/>
</a>

<br/><br/>

<img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white&style=flat-square"/>
<img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white&style=flat-square"/>
<img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white&style=flat-square"/>
<img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white&style=flat-square"/>
<img src="https://img.shields.io/badge/Zustand-5.0-FF6B35?style=flat-square"/>
<img src="https://img.shields.io/badge/NetworkX-3.3-E37B40?style=flat-square"/>
<img src="https://img.shields.io/badge/Vitest-3.0-729B1B?logo=vitest&logoColor=white&style=flat-square"/>
<img src="https://img.shields.io/badge/pytest-8.3-0A9EDC?logo=pytest&logoColor=white&style=flat-square"/>
<img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white&style=flat-square"/>

<br/><br/>

<table>
  <tr>
    <td align="center">🧩<br/><b>9 Node Types</b></td>
    <td align="center">🔄<br/><b>Dual DAG Detection</b></td>
    <td align="center">⚡<br/><b>Topological Execution</b></td>
    <td align="center">🛡️<br/><b>SSRF + ReDoS Guards</b></td>
    <td align="center">🧪<br/><b>14 Backend / 7 Frontend Tests</b></td>
    <td align="center">📦<br/><b>One-command Docker</b></td>
  </tr>
</table>

</div>

---

## Table of Contents

- [What This Is](#what-this-is)
- [30-Second Setup](#30-second-setup)
- [Assessment Parts 1–4: Direct Mapping](#assessment-parts-14-direct-mapping)
- [Engineering Decisions](#engineering-decisions)
- [System Architecture](#system-architecture)
- [Data Flow: Validate Pipeline](#data-flow-validate-pipeline)
- [Data Flow: Run Pipeline](#data-flow-run-pipeline)
- [Text Node: Variable Parsing](#text-node-variable-parsing)
- [Security: SSRF Protection](#security-ssrf-protection)
- [Security: ReDoS Isolation](#security-redos-isolation)
- [State Management](#state-management)
- [Persistence: Debounced Autosave](#persistence-debounced-autosave)
- [Running Tests](#running-tests)
- [Node Reference](#node-reference)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Tech Stack](#tech-stack)
- [Known Limitations](#known-limitations)
- [Candidate](#candidate)

---

## What This Is

A self-contained, locally runnable analogue of VectorShift's no-code AI workflow product. You can:

- **Drag and connect** 9 typed nodes onto a ReactFlow canvas to describe a data processing pipeline
- **Execute** the pipeline against a FastAPI backend that runs nodes in **topological order**, with real Gemini 1.5 Flash output (DuckDuckGo fallback → explicit mock notice when both unavailable — never silent failure)
- **Validate** the graph as a DAG **client-side first** (instant DFS, skips the network if a cycle is already found) and server-side (NetworkX, authoritative)
- **Undo, redo, search, export, import** with the full state **persisted to localStorage** via debounced writes — not one write per keystroke

---

## 30-Second Setup

```bash
# Unzip the submission, then from the root:
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |

> **No Gemini key?** The LLM node falls back to DuckDuckGo scraping, then to an explicit Mock Mode message. The pipeline still runs — it just tells you honestly what happened.

**Manual setup (no Docker):**

```bash
# Backend
cd backend && python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # optionally add GEMINI_API_KEY
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
npm install && npm run dev      # → http://localhost:3000
```

---

## Assessment Parts 1–4: Direct Mapping

> This section maps every criterion directly to the code that implements it. No ambiguity about where to look.

### Part 1 — Node Abstraction

Every node renders through a single `BaseNode` component driven by a `NODE_CONFIGS` registry:

```typescript
// src/types/node.types.ts
NODE_CONFIGS[NodeType.FILTER] = {
  label:       "Filter",
  color:       "#ef4444",
  inputs:      1,
  outputs:     1,
  defaultData: { condition: "contains", value: "" }
}
```

Adding a 10th node type requires exactly: one enum value, one config entry, one TSX component wrapping `<BaseNode>`, one line in `nodeRegistry.ts`. Zero copied layout code.

The 5 additional node types beyond the original 4 are: **Transform** · **Merge** · **Filter** · **API** · **Delay**. Each gets named handles with hover-reveal tooltips. Dynamic-input nodes (Text) create handles on the fly from `{{variable}}` parsing.

### Part 2 — Styling

- Concentric bezel design: frosted-glass outer shell + solid inner card + per-type left accent stripe (inspired by hardware synthesizer UI panels)
- Dark / light mode: `D` key toggles, stored in localStorage, applied via `<html class="dark">` so Tailwind's `dark:` utilities work globally without a context provider
- **Execution-state glow:** `nodeExecutionStates` drives a CSS ring — yellow pulsing (running), solid green (success), solid red (error/cycle)
- Framer Motion `AnimatePresence` on node creation, properties panel slide, result modals
- First-launch onboarding: animated 3-step tutorial card (`hasOnboarded = false`), dismissed with "Get Started"
- ErrorBoundary wrapping `<App>` — a component crash shows a recovery UI, not a blank page

### Part 3 — Text Node `{{variable}}` Logic

- `extractVariables()` in `src/utils/variableParser.ts` uses a single regex with full JS identifier support
- `store.updateNode()` auto-prunes edges targeting removed variables — rename `{{name}}` to `{{username}}` and the stale edge disappears without manual intervention
- Width expands with content (`min(max(contentWidth, 200px), 450px)`); height expands with lines (`min(scrollHeight, 200px)`)
- See the full [Text Node: Variable Parsing](#text-node-variable-parsing) flowchart below

### Part 4 — Backend: `/pipelines/parse` + DAG Detection + Custom Modal

- `POST /pipelines/parse` returns `{ num_nodes, num_edges, is_dag }` — the assessment-specified endpoint, stable and minimal
- The Submit button in `src/submit.tsx` uses a **Radix UI `<Dialog>`** modal — `window.alert()` is not called anywhere in the codebase
- Frontend pre-checks with client-side DFS; if a cycle is found it shows the result instantly without touching the network
- Backend uses `networkx.is_directed_acyclic_graph()` as the authoritative check
- `POST /api/pipelines/run` executes nodes in the backend's own `topological_sort()` order and returns that order — the frontend animates *over the backend's sequence*, not a client recomputation

---

## Engineering Decisions

> The "what" is in the code. The "why" is here. These are the tradeoffs I weighed and why I landed where I did.

### 1. Dual-layer DAG validation (client DFS + server NetworkX) rather than server-only

Sending a POST request on every Validate click introduces 20–150ms of latency even on localhost. For the common case — a user who just created a cycle by connecting two nodes — that delay makes the feedback feel sluggish.

The client-side DFS in `dagValidation.ts` runs synchronously in ~0.1ms for graphs under 100 nodes. If it finds a cycle, the nodes glow red immediately and the network round-trip is skipped entirely. If it passes, the server gets the final word — NetworkX's `is_directed_acyclic_graph()` is the authoritative result that actually gates execution.

This mirrors how production systems layer fast heuristic checks in front of authoritative validators.

### 2. Zustand over Redux / React Context

The pipeline store holds nodes, edges, a 50-entry history stack, execution states, and persistence state. That's one coherent slice of state with tight coupling between the history writes and the localStorage persistence timer. Redux would require 3–4 separate slices, action creators, and `combineReducers` — all boilerplate for no architectural gain on a single-store app. React Context would re-render every subscriber on every node position change during drag (60fps × full subtree = janky canvas).

Zustand gives atomic subscriptions (`usePipelineStore(s => s.nodes)` only re-renders when `nodes` reference changes), no provider nesting, and synchronous state reads via `getState()` in the debounced persist callback.

### 3. Debounced localStorage writes (600ms) rather than write-on-every-change

`onNodesChange` fires on every pointer-move frame while dragging a node. At 60fps that's one `JSON.stringify(fullPipeline)` per frame. On a pipeline with 20 nodes that's a non-trivial serialization every 16ms.

A `setTimeout` that resets on each call collapses the entire drag into a single write 600ms after the drag ends. The `beforeunload` listener flushes synchronously on tab close, so the last few seconds of work are never lost.

### 4. Multiprocessing for ReDoS isolation rather than threading

Python's GIL means a thread running a catastrophic regex (`(a+)+$` against 30 `a`s) would block all other async tasks in the same process — including responding to other HTTP requests. A `multiprocessing.Process` gets its own interpreter and GIL, so `process.terminate()` after 1 second actually kills the regex evaluator without touching the main event loop.

The cost is the fork overhead (~20–50ms). For a filter operation that might otherwise hang a server indefinitely, that's an acceptable trade.

### 5. Client-side edge pruning on variable rename rather than server-side reconciliation

When a user renames `{{name}}` to `{{username}}` in a Text node, any edge targeting the old `input-name` handle is now dangling. Leaving dangling edges to be caught at execution time would produce a confusing "missing input" error. Pruning them immediately in `store.updateNode()` — before the state is committed to history — means the undo of a rename also restores the pruned edge, giving clean time-travel behavior.

### 6. `/pipelines/parse` kept minimal; `/api/pipelines/validate` carries richer data

The assessment specifies `{ num_nodes, num_edges, is_dag }`. Adding `cycle_nodes` to that response would require the frontend Submit button to handle a richer contract that wasn't asked for. Instead, the minimal parse endpoint stays stable. The richer validate endpoint (with `cycle_nodes[]` and `message`) is what the Validate button uses for the red-glow animation, keeping the two use cases decoupled.

---

## System Architecture

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                         REACT FRONTEND  (port 3000)                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ┌─────────────┐   drag/drop    ┌─────────────────────────────────────────┐ ║
║  │   Toolbar   │ ─────────────► │        PipelineCanvas.tsx               │ ║
║  │  9 node     │                │  ReactFlow (controlled mode)            │ ║
║  │  types +    │                │  onNodesChange → store.setNodes         │ ║
║  │  search     │                │  onEdgesChange → store.setEdges         │ ║
║  └─────────────┘                │  onConnect    → store.addEdge           │ ║
║                                 │  onDrop       → store.addNode           │ ║
║  ┌─────────────┐                └──────────────────┬──────────────────────┘ ║
║  │ Properties  │                                   │ reads/writes          ║
║  │  Panel      │ ◄──────────────────────────────── │                       ║
║  │ (slide-in)  │                                   ▼                       ║
║  └─────────────┘                ┌─────────────────────────────────────────┐ ║
║                                 │           Zustand Store                 │ ║
║  ┌─────────────┐                │  nodes[]  edges[]  history[50]          │ ║
║  │  Keyboard   │                │  selectedNodeId   isDarkMode            │ ║
║  │  Shortcuts  │                │  nodeExecutionStates  cycleNodes        │ ║
║  │  Modal      │                │  hasOnboarded   lastSaved               │ ║
║  └─────────────┘                └──────────┬──────────────────────────────┘ ║
║                                            │                               ║
║  ┌─────────────┐                           │ debounced (600ms)             ║
║  │  Onboarding │         ┌─────────────────▼─────────────────┐            ║
║  │  Tutorial   │         │         localStorage               │            ║
║  └─────────────┘         │  "vectorshift-pipeline" key        │            ║
║                          │  nodes + edges + isDarkMode        │            ║
║                          └────────────────────────────────────┘            ║
║                                                                              ║
║  dagValidation.ts  ◄── client-side DFS pre-check (instant, no network)     ║
║  variableParser.ts ◄── {{variable}} → dynamic target handles               ║
║  submit.tsx        ◄── POST /pipelines/parse → Radix Dialog modal          ║
║                                                                              ║
╠══════════════════════════╦═══════════════════════════════════════════════════╣
║    HTTP / JSON           ║  POST /pipelines/parse         (assessment spec) ║
║                          ║  POST /api/pipelines/validate  (cycle_nodes[])   ║
║                          ║  POST /api/pipelines/run       (topological exec) ║
║                          ║  GET  /api/health                                ║
╠══════════════════════════╩═══════════════════════════════════════════════════╣
║                        FASTAPI BACKEND  (port 8000)                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  main.py                                                                     ║
║  ├── CORS from CORS_ORIGINS env var (default: localhost:3000 + :5173)       ║
║  ├── GET  /  → RedirectResponse("/docs")                                    ║
║  ├── POST /pipelines/parse  → validate_pipeline()                           ║
║  └── include_router(api_router, prefix="/api")                              ║
║                                                                              ║
║  router.py  (/api prefix)                                                   ║
║  ├── POST /pipelines/validate  → validate_pipeline() + cycle_nodes          ║
║  ├── POST /pipelines/run       → execute_pipeline() (topological order)     ║
║  └── GET  /health              → { status: "ok", version: "1.0.0" }        ║
║                                                                              ║
║  services.py                                                                 ║
║  ├── validate_pipeline()     NetworkX DiGraph → is_dag + cycle_nodes        ║
║  ├── execute_pipeline()      topological_sort → per-node async handlers     ║
║  ├── is_safe_url()           SSRF: DNS resolve → full IP range check        ║
║  ├── safe_regex_match()      ReDoS: multiprocessing worker + 1s timeout     ║
║  └── execute_llm_node()      Gemini 1.5 Flash → DDG scrape → mock notice   ║
║                                                                              ║
║  models.py  (Pydantic v2)                                                    ║
║  ├── PipelineNode / PipelineEdge / PipelineRequest                          ║
║  ├── PipelineResponse   { num_nodes, num_edges, is_dag, cycle_nodes }       ║
║  ├── PipelineRunResponse { success, execution_order[], node_updates{} }     ║
║  └── HealthResponse                                                          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Data Flow: Validate Pipeline

```
User clicks "Validate"
         │
         ▼
┌─────────────────────────────┐
│  Client-side DFS pre-check  │  O(V+E), instant, no network round-trip
│  validateDag(nodes, edges)  │  src/utils/dagValidation.ts
└──────────────┬──────────────┘
               │
       ┌───────┴────────┐
       │                │
   cycle found?       no cycle
       │                │
       ▼                ▼
┌──────────────┐   ┌─────────────────────────────────┐
│  Set cycle   │   │  POST /api/pipelines/validate   │
│  nodes red   │   │  { nodes[], edges[] }           │
│  Show modal  │   └──────────────┬──────────────────┘
│  Skip network│                  │
│  round-trip  │   ┌──────────────▼──────────────────┐
└──────────────┘   │  backend: validate_pipeline()   │
                   │                                 │
                   │  G = nx.DiGraph()               │
                   │  G.add_nodes_from(node.id)      │
                   │  G.add_edges_from(edges)        │
                   │                                 │
                   │  nx.is_directed_acyclic_graph(G)│
                   └──────────────┬──────────────────┘
                                  │
                        ┌─────────┴─────────┐
                        │                   │
                   is_dag=True         is_dag=False
                        │                   │
                        ▼                   ▼
                ┌───────────────┐  ┌──────────────────────┐
                │  "Valid DAG!" │  │ nx.find_cycle() →    │
                │  green toast  │  │ cycle_nodes[]        │
                └───────────────┘  │ nodes glow red ring  │
                        │          └──────────────────────┘
                        └─────────┬─────────┘
                                  ▼
                    ┌─────────────────────────┐
                    │  { num_nodes,           │
                    │    num_edges,           │
                    │    is_dag,              │
                    │    cycle_nodes[],       │
                    │    message }            │
                    └─────────────────────────┘
```

---

## Data Flow: Run Pipeline

```
User clicks "Run"
         │
         ▼
┌─────────────────────────────┐
│  All nodes → state: idle    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  POST /api/pipelines/run    │
│  { nodes[], edges[] }       │
└──────────────┬──────────────┘
               │
               ▼
╔═════════════════════════════════════════════════════════════════╗
║              execute_pipeline()  — services.py                  ║
║                                                                  ║
║  1. Build NetworkX DiGraph from nodes + edges                   ║
║  2. nx.is_directed_acyclic_graph() → raise 400 if cycle         ║
║  3. execution_order = list(nx.topological_sort(G))              ║
║                                                                  ║
║  outputs = {}   # (node_id, source_handle) → value             ║
║                                                                  ║
║  for node_id in execution_order:                                ║
║  │                                                               ║
║  ├── resolve incoming_values:                                   ║
║  │   for edge where target == node_id:                          ║
║  │     val = outputs[(edge.source, edge.sourceHandle)]          ║
║  │     incoming[edge.targetHandle] = val                        ║
║  │                                                               ║
║  ├── handler = NODE_HANDLERS[node.type]                         ║
║  │                                                               ║
║  │  input     →  pass inputValue downstream                     ║
║  │  output    →  store incoming on "input-0"                    ║
║  │  text      →  {{var}} replacement from incoming_values       ║
║  │  llm       →  Gemini 1.5 Flash (system + prompt handles)     ║
║  │  transform →  7 modes (upper/lower/trim/reverse/slug/json)   ║
║  │  merge     →  5 strategies (concat/join_comma/join_nl/…)     ║
║  │  filter    →  7 conditions + ReDoS-isolated regex mode       ║
║  │  api       →  SSRF-checked httpx.request, timeout=10s        ║
║  │  delay     →  await asyncio.sleep(min(duration, 5.0))        ║
║  │                                                               ║
║  ├── outputs[(node_id, "output-0")] = output_val               ║
║  └── node_updates[node_id] = { "outputValue": output_val }     ║
║                                                                  ║
║  return { success, execution_order[], node_updates{} }          ║
╚═════════════════════════════════════════════════════════════════╝
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Frontend animates over backend's execution_order[]             │
│                                                                   │
│  for nodeId in data.execution_order:                            │
│    setNodeExecutionState(nodeId, "running")  → yellow pulse      │
│    await sleep(300ms)                                           │
│    updateNode(nodeId, data.node_updates[nodeId])                │
│    setNodeExecutionState(nodeId, "success")  → solid green      │
│                                                                   │
│  The frontend uses the backend's topological ordering directly— │
│  not a client recomputation that might differ on multi-path DAGs.│
└─────────────────────────────────────────────────────────────────┘
```

---

## Text Node: Variable Parsing

```
User types in TextNode textarea
              │
              ▼  (onChange → store.updateNode, debounced 800ms)

Input:  "Hello {{name}}, your score is {{score}}."
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│  extractVariables(text)  — src/utils/variableParser.ts   │
│                                                           │
│  VARIABLE_REGEX =                                         │
│    /\{\{\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\}\}/g          │
│                                                           │
│  Captures:  [ "name", "score" ]                          │
│  Deduped:   new Set(matches)                             │
│                                                           │
│  Valid JS identifiers only:                              │
│  ✓  {{name}}  ✓  {{count_2}}  ✓  {{$value}}             │
│  ✗  {{1bad}}  ✗  {{my-var}}   ✗  {{  }}                 │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│  store.updateNode(id, { text, variables })               │
│                                                           │
│  Edge-pruning (prevents dangling edges on rename):       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  validHandles = Set( "input-" + v for v in vars )│   │
│  │  for edge where edge.target === this node:        │   │
│  │    if edge.targetHandle not in validHandles:      │   │
│  │      store.deleteEdge(edge.id)                    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│  TextNode renders dynamic target handles                  │
│                                                           │
│  ┌────────────────────────────────────────┐              │
│  │  [●] name   ╔══════════════════════╗   │              │
│  │             ║ TextNode             ║   │              │
│  │  [●] score  ║                      ║──────────► [●]   │
│  │             ║ "Hello {{name}},     ║         output-0 │
│  │             ║  score: {{score}}"   ║                  │
│  │             ╚══════════════════════╝                  │
│  └────────────────────────────────────────┘              │
│                                                           │
│  Width  = min(max(content_width, 200px), 450px)          │
│  Height = min(textarea.scrollHeight, 200px)              │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼  (at backend execution time)
┌──────────────────────────────────────────────────────────┐
│  execute_text_node()  — services.py                       │
│                                                           │
│  incoming = { "input-name": "Alice",                     │
│               "input-score": "98" }                      │
│                                                           │
│  for var in variables:                                    │
│    template = template.replace(f"{{{{{var}}}}}", val)    │
│                                                           │
│  output → "Hello Alice, your score is 98."              │
└──────────────────────────────────────────────────────────┘
```

---

## Security: SSRF Protection

```
API Node URL: http://192.168.1.1/admin
                     │
                     ▼
              is_safe_url(url)
              services.py
                     │
         ┌───────────▼───────────┐
         │ scheme in             │
         │  ("http", "https")?   │
         └───────────┬───────────┘
                     │
            NO ──────┘──── YES
            │               │
            ▼               ▼
         BLOCK       socket.getaddrinfo(hostname, None)
       return False         │
                   ┌────────▼─────────────────────────┐
                   │  For every resolved (family, IP): │
                   │                                   │
                   │  ip.is_loopback?   → 127.x, ::1  │
                   │  ip.is_private?    → RFC 1918     │
                   │  ip.is_link_local? → 169.254.x.x │
                   │  ip.is_multicast?  → 224.x.x.x   │
                   │  ip.is_reserved?   → IANA blocks  │
                   │  ip.is_unspecified?→ 0.0.0.0      │
                   └────────┬──────────────────────────┘
                            │
             ┌──────────────┴──────────────┐
             │ ANY match = True            │ ALL False
             ▼                             ▼
      BLOCK — return False          ALLOW → httpx.request()
      API node output:              timeout = 10s
      "URL security validation      response stored as
       failed: blocked by           output value
       SSRF protection"

⚠ Known DNS-rebinding gap (documented in Known Limitations):
  The IP check runs before the httpx connection opens. A TOCTOU
  attack is possible via adversarial DNS. Production closure
  requires connecting directly to the validated IP with the
  original Host/SNI header, or an egress proxy with its own
  allowlist — out of scope at the application layer here.
```

---

## Security: ReDoS Isolation

```
Filter Node: condition="regex", value="(a+)+$"
                        │
                        ▼
           safe_regex_match(pattern, text)
           services.py
                        │
         ┌──────────────▼──────────────────┐
         │  len(pattern) > 100?             │ → reject
         │  len(text)    > 1000?            │ → reject
         │  re.compile(pattern) → syntax?  │ → reject
         └──────────────┬───────────────────┘
                        │
             ┌──────────▼──────────┐
             │  ctx = multiprocessing
             │       .get_context()│
             │  queue = ctx.Queue()│
             │                     │
             │  process = ctx.Process
             │  (target=_worker,   │
             │   args=(pattern,    │
             │         text,       │
             │         queue))     │
             └──────────┬──────────┘
                        │
                        ▼
       ┌────────────────────────────────────┐
       │  process.start()                   │
       │                                    │
       │  MAIN EVENT LOOP CONTINUES ────────┼──► other HTTP requests
       │  (async worker is NOT blocked)     │
       │                                    │
       │  process.join(timeout=1.0)         │
       └────────────┬───────────────────────┘
                    │
        ┌───────────┴────────────┐
        │                        │
   still alive?              completed
        │                        │
        ▼                        ▼
┌──────────────────┐  ┌─────────────────────────┐
│  process.        │  │  result = queue.get()   │
│  terminate()     │  │  return True/False      │
│  process.join()  │  └─────────────────────────┘
│  (clean zombie)  │
│                  │
│  ValueError:     │
│  "Regex timed    │
│   out after 1s"  │
└──────────────────┘

Pattern "((a+)+)$" on 30 'a's → ~1 billion backtrack steps.
Without protection:  hangs the server process indefinitely.
With protection:     terminated in exactly 1.0 second.
Why multiprocessing (not threading): Python's GIL means a
  rogue thread still blocks all async tasks in the process.
  A separate Process has its own interpreter and GIL.
```

---

## State Management

```
╔══════════════════════════════════════════════════════════════════╗
║                     Zustand Store Schema                         ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  CANVAS STATE                                                     ║
║    nodes[]                  Node<NodeData>[]  — ReactFlow ctrl    ║
║    edges[]                  Edge[]            — ReactFlow ctrl    ║
║    selectedNodeId           string | null                         ║
║                                                                   ║
║  HISTORY (time-travel undo/redo)                                  ║
║    history[]                snapshot[]        max 50 entries      ║
║    historyIndex             number                                 ║
║                                                                   ║
║  EXECUTION                                                        ║
║    nodeExecutionStates      Record<id, ExecutionState>            ║
║    cycleNodes               string[]          shown as red ring   ║
║                                                                   ║
║  PERSISTENCE                                                      ║
║    isDarkMode               boolean           saved to LS         ║
║    hasOnboarded             boolean           saved to LS         ║
║    lastSaved                number | null     timestamp           ║
║                                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║                     Action → History Policy                       ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  IMMEDIATE (one undo step per action)                             ║
║    addNode  deleteNode  onConnect  deleteEdge                     ║
║    importPipeline  clearCanvas  addEdge                           ║
║                                                                   ║
║  DEBOUNCED (800ms — coalesces rapid edits into one step)          ║
║    updateNode()      — typing in any field                        ║
║    onNodesChange()   — pointer-move during drag                   ║
║                                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║                     Undo / Redo (50-entry ring)                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Initial       [snap_0]                   historyIndex = 0       ║
║  After 3       [snap_0, snap_1, snap_2,   historyIndex = 3       ║
║  actions        snap_3]                                           ║
║  Undo          [snap_0, snap_1, snap_2,   historyIndex = 2       ║
║                 snap_3]        ↑ restore snap_2                   ║
║  New action    [snap_0, snap_1, snap_2,   historyIndex = 3       ║
║  after undo     snap_3_new]   (future branch discarded)           ║
║                                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║                    Node Execution State Machine                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║         "idle" ──► "running" (yellow pulse) ──► "success"        ║
║            │             │                        (green)         ║
║            │             └──────────────────────► "error"         ║
║            │                                      (red)           ║
║            └── cycle detected → "error" on all cycleNodes        ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Persistence: Debounced Autosave

```
User action (typing / dragging)
              │
              ▼
  store.updateNode() / setNodes() / setEdges()
              │
              ├── Zustand set() ──► in-memory state updated INSTANTLY
              │
              └── schedulePersist(get)
                            │
                            ▼
                  clearTimeout(persistTimer)   ← resets the clock on
                  persistTimer = setTimeout(   every action while in
                    persistState, 600ms)       rapid motion
                            │
                       600ms passes
                       with no new action
                            │
                            ▼
                  JSON.stringify(state)
                  → localStorage
                    "vectorshift-pipeline"

  beforeunload listener (registered once at module init):
    if (persistTimer) {
      clearTimeout(persistTimer)   ← cancel pending delay
      persistState(getState())     ← flush synchronously NOW
    }

  Result: last seconds of work are NEVER lost on tab close.

  Why this matters:
  onNodesChange fires on every pointer-move frame during drag.
  Without debouncing: ~60 JSON.stringify(fullPipeline) calls/sec.
  With debouncing:    exactly 1 write, 600ms after drag ends.
```

---

## Running Tests

### Backend — 14 tests, 2 files

```bash
cd backend
source venv/bin/activate   # Windows: venv\Scripts\activate
pytest tests/ -v
```

```
tests/test_dag.py::test_empty_pipeline                          PASSED
tests/test_dag.py::test_linear_pipeline_is_dag                  PASSED
tests/test_dag.py::test_cycle_detected                          PASSED
tests/test_dag.py::test_self_loop                               PASSED
tests/test_dag.py::test_complex_dag                             PASSED
tests/test_dag.py::test_complex_cycle                           PASSED
tests/test_execution.py::test_execute_simple_chain              PASSED
tests/test_execution.py::test_execute_text_variable_replacement PASSED
tests/test_execution.py::test_execute_transform_node            PASSED
tests/test_execution.py::test_execute_merge_node                PASSED
tests/test_execution.py::test_execute_filter_node               PASSED
tests/test_execution.py::test_redos_protection                  PASSED
tests/test_execution.py::test_ssrf_protection                   PASSED
tests/test_execution.py::test_api_endpoints_with_test_client    PASSED

========================= 14 passed in ~2.3s ==============================
```

> `test_ssrf_protection` resolves real DNS (`google.com`, `localhost`, `169.254.x.x`) — needs outbound network access.  
> `test_redos_protection` spawns a real subprocess and verifies the 1s timeout fires — takes ~1 second to run by design.

### Frontend — 7 tests, 2 files

```bash
npm test
```

```
✓ src/test/unit.test.ts (5)
  ✓ variableParser › should extract variables from text
  ✓ variableParser › should deduplicate variables
  ✓ dagValidation › should validate a simple DAG
  ✓ dagValidation › should detect a simple cycle
  ✓ dagValidation › should detect a self loop

✓ src/test/components.test.tsx (2)
  ✓ BaseNode › should render the header and children
  ✓ TextNode › should render TextNode with variables

 Test Files  2 passed (2)
 Tests       7 passed (7)
```

---

## Node Reference

| Node | Colour | In | Out | Description |
|---|---|:---:|:---:|---|
| **Input** | `#3b82f6` Blue | 0 | 1 | Named text/file source. `inputValue` is the string passed downstream. |
| **Output** | `#22c55e` Green | 1 | 0 | Renders final result. Execution writes the incoming value to `outputValue`. |
| **LLM** | `#a855f7` Purple | 2 | 1 | Named handles: `system` + `prompt`. Model picker + temperature slider. Always calls Gemini 1.5 Flash (see Known Limitations). |
| **Text** | `#f97316` Orange | Dynamic | 1 | `{{variable}}` creates live target handles. Width and height auto-expand. |
| **Transform** | `#6366f1` Indigo | 1 | 1 | `uppercase` · `lowercase` · `trim` · `reverse` · `slugify` · `json_parse` · `json_stringify` |
| **Merge** | `#ec4899` Pink | 3 | 1 | `concat` · `join_comma` · `join_newline` · `object_merge` · `array_merge` |
| **Filter** | `#ef4444` Red | 1 | 1 | `contains` · `equals` · `starts_with` · `ends_with` · `greater_than` · `less_than` · `regex` (ReDoS-isolated) |
| **API** | `#06b6d4` Cyan | 1 | 1 | GET/POST/PUT/PATCH/DELETE. URL is SSRF-checked before every request. Custom headers supported. |
| **Delay** | `#eab308` Yellow | 1 | 1 | Pause in `ms` / `seconds` / `minutes`. Server-side hard cap at 5 seconds regardless of config. |

---

## API Reference

### `POST /pipelines/parse`
*Assessment-specified minimal endpoint.*

```jsonc
// Request
{
  "nodes": [
    { "id": "n1", "type": "input",  "position": { "x": 0,   "y": 0 }, "data": {} },
    { "id": "n2", "type": "output", "position": { "x": 400, "y": 0 }, "data": {} }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2",
      "sourceHandle": "output-0", "targetHandle": "input-0" }
  ]
}

// 200 OK
{ "num_nodes": 2, "num_edges": 1, "is_dag": true }
```

---

### `POST /api/pipelines/validate`
*Extended validation — same algorithm, richer response with cycle node IDs.*

```jsonc
// 200 OK — valid DAG
{
  "num_nodes": 4,
  "num_edges": 3,
  "is_dag": true,
  "cycle_nodes": [],
  "message": "Valid DAG pipeline!"
}

// 200 OK — cycle detected
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
*Full topological execution. Returns the backend's own execution order and per-node output values.*

```jsonc
// 200 OK
{
  "success": true,
  "execution_order": ["n1", "n2", "n3", "n4"],
  "node_updates": {
    "n2": { "outputValue": "Hello Alice!" },
    "n3": { "outputValue": "HELLO ALICE!" },
    "n4": { "outputValue": "HELLO ALICE!" }
  }
}

// 400 — cycle present
{ "detail": "Cannot run pipeline containing cycles." }
```

---

### `GET /api/health`

```jsonc
{ "status": "ok", "version": "1.0.0" }
```

### `GET /`
Permanent redirect (`301`) to `/docs` — Swagger UI auto-opens on browser visit to the API root.

---

## Project Structure

```
.
├── src/
│   ├── components/
│   │   ├── nodes/
│   │   │   ├── BaseNode.tsx           ← Single layout for ALL node types
│   │   │   ├── InputNode.tsx
│   │   │   ├── OutputNode.tsx
│   │   │   ├── LLMNode.tsx            ← model picker + temperature + systemPrompt
│   │   │   ├── TextNode.tsx           ← {{variable}} + auto-resize
│   │   │   ├── TransformNode.tsx      ← 7 transforms
│   │   │   ├── MergeNode.tsx          ← 5 merge strategies, 3 inputs
│   │   │   ├── FilterNode.tsx         ← 7 conditions + ReDoS-safe regex
│   │   │   ├── APINode.tsx            ← HTTP caller, SSRF-checked URL
│   │   │   ├── DelayNode.tsx          ← server-capped timed pause
│   │   │   └── nodeRegistry.ts        ← NodeType → React component map
│   │   ├── PipelineCanvas.tsx         ← ReactFlow controlled canvas + action bar
│   │   ├── Toolbar.tsx                ← node palette, search, shortcuts
│   │   ├── PropertiesPanel.tsx        ← slide-in inspector for selected node
│   │   ├── OnboardingTutorial.tsx     ← first-launch animated 3-step guide
│   │   ├── KeyboardShortcutsModal.tsx
│   │   └── ErrorBoundary.tsx          ← crash recovery UI
│   ├── store/
│   │   └── pipelineStore.ts           ← Zustand: nodes, edges, history,
│   │                                    execution states, debounced persist
│   ├── types/
│   │   ├── node.types.ts              ← NodeType enum, NODE_CONFIGS, NodeData union
│   │   └── api.types.ts               ← typed DTOs for all API responses
│   ├── utils/
│   │   ├── variableParser.ts          ← extractVariables() — {{var}} regex
│   │   ├── dagValidation.ts           ← validateDag() + getTopologicalOrder()
│   │   └── constants.ts               ← NODE_COLORS, API_BASE_URL
│   ├── test/
│   │   ├── setup.ts                   ← ResizeObserver mock for jsdom
│   │   ├── unit.test.ts               ← variableParser + dagValidation
│   │   └── components.test.tsx        ← BaseNode + TextNode render tests
│   ├── submit.tsx                     ← Submit button + Radix Dialog modal
│   ├── App.tsx                        ← root layout, dark mode class
│   ├── main.tsx                       ← createRoot + ErrorBoundary
│   └── index.css                      ← Tailwind base + CSS vars
│
├── backend/
│   ├── main.py                        ← FastAPI app, CORS, /pipelines/parse
│   ├── app/
│   │   ├── router.py                  ← /api: validate, run, health
│   │   ├── models.py                  ← Pydantic v2 request/response schemas
│   │   └── services.py                ← validate_pipeline, execute_pipeline,
│   │                                    is_safe_url (SSRF), safe_regex_match (ReDoS),
│   │                                    execute_llm_node (Gemini/DDG/mock)
│   ├── tests/
│   │   ├── conftest.py                ← anyio asyncio backend fixture
│   │   ├── test_dag.py                ← 6 DAG validation tests
│   │   └── test_execution.py          ← 8 execution + security tests (anyio async)
│   ├── .env.example
│   ├── Dockerfile
│   └── requirements.txt
│
├── Dockerfile                         ← multi-stage: node build → nginx serve
├── docker-compose.yml                 ← full-stack + hot-reload
├── nginx.conf                         ← gzip, 1yr cache, SPA fallback
├── .dockerignore
├── backend/.dockerignore
├── .env.example                       ← VITE_API_URL only
├── .gitignore                         ← venv, __pycache__, .env, node_modules
└── README.md
```

---

## Environment Variables

### Backend — `backend/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | No | — | Google AI Studio key. Falls back to DuckDuckGo HTML scraping, then explicit mock-mode notice. |
| `CORS_ORIGINS` | No | `localhost:3000,localhost:5173` | Comma-separated allowed origins. Read at startup via `os.getenv()`. |

### Frontend — `.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:8000` | Backend base URL. Baked into the bundle at compile time by Vite. |

> **Security note:** do not add a Gemini key to the frontend `.env`. Any `VITE_`-prefixed variable is compiled into the public JavaScript bundle and visible in DevTools. The Gemini key belongs only in `backend/.env`, transmitted as a server-side request header.

---

## Tech Stack

| Layer | Technology | Version | Role |
|---|---|---|---|
| Frontend framework | React | 19.2 | UI rendering |
| Canvas | @xyflow/react | 12.11 | Controlled node-based DAG canvas |
| State | Zustand | 5.0 | Single store, atomic subscriptions, no provider boilerplate |
| Animation | Framer Motion | 12.40 | Spring animations, presence transitions |
| Icons | Lucide React | 0.562 | Consistent icon system |
| Styling | Tailwind CSS | 3.4 | Utility-first, dark mode via `class` strategy |
| Language (FE) | TypeScript | 5.9 | Strict mode throughout |
| Bundler | Vite | 7.2 | Dev server + multi-stage production build |
| Frontend tests | Vitest + Testing Library | 3.0 | Unit + component render tests |
| Backend framework | FastAPI | 0.115 | Async REST API, auto-generated Swagger docs |
| Graph engine | NetworkX | 3.3 | `is_dag()`, `topological_sort()`, `find_cycle()` |
| Validation | Pydantic | ≥ 2.10 | Typed request/response schemas |
| HTTP client | httpx | 0.27 | Async outbound calls (API node, Gemini) |
| Language (BE) | Python | 3.12 | Backend runtime |
| Backend tests | pytest + anyio | 8.3 | Sync + async test suite |
| Web server | Nginx Alpine | latest | Gzip compression, 1yr static asset caching, SPA fallback |
| Containerisation | Docker + Compose | — | Reproducible one-command setup |

---

## Known Limitations

These are documented honestly rather than left for a reviewer to discover.

**1. LLM model picker is cosmetic.**
The dropdown shows GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Flash/Pro. Execution always calls `gemini-1.5-flash` via the Gemini REST API, regardless of selection. Real multi-provider routing — calling OpenAI or Anthropic based on the selected model — is the obvious next step and would require per-provider API key management and a provider abstraction layer in `services.py`.

**2. SSRF has a residual DNS-rebinding gap.**
The IP validation check runs before the `httpx` connection is opened (TOCTOU). A sufficiently adversarial DNS server could return a public IP at check time, then rebind to a private address for the actual connection. Closing this properly requires either connecting directly to the validated IP with the original Host/SNI header, or routing all egress through a dedicated proxy with its own allowlist — infrastructure-level work that is out of scope for an application-layer check.

**3. DuckDuckGo scraping fallback is inherently fragile.**
It parses HTML with regexes. If DuckDuckGo changes their markup, the fallback degrades gracefully to an explicit "Mock Mode" notice — it does not silently return empty output or raise an uncaught exception. This behaviour is tested.

**4. Delay node is server-side hard-capped at 5 seconds.**
`min(sleep_time, 5.0)` prevents a misconfigured or malicious delay from tying up an async worker indefinitely. The correct production approach is a configurable cap via environment variable, with the default remaining at 5 seconds.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |
| `Ctrl + Y` | Redo (alternate) |
| `Ctrl + S` | Export pipeline as JSON |
| `Ctrl + O` | Import pipeline from JSON |
| `Ctrl + K` | Toggle node search |
| `D` | Toggle dark / light mode |
| `?` | Open keyboard shortcuts modal |
| `Delete` / `Backspace` | Delete selected node |
| `Esc` | Close any open modal |

---

## Candidate

**Manoj RS** — B.E. Electronics and Communication Engineering, VVCE Mysuru (2022–2026).
Android Development Intern at MindMatrix, Bengaluru (Jan–May 2026).

<table>
  <tr>
    <td><b>GitHub</b></td>
    <td><a href="https://github.com/Manoj-0810">github.com/Manoj-0810</a></td>
  </tr>
  <tr>
    <td><b>Portfolio</b></td>
    <td><a href="https://my-portfolio-manoj-008.vercel.app">my-portfolio-manoj-008.vercel.app</a></td>
  </tr>
  <tr>
    <td><b>LinkedIn</b></td>
    <td><a href="https://www.linkedin.com/in/manoj-r-s-644560275">linkedin.com/in/manoj-r-s-644560275</a></td>
  </tr>
</table>

---

<div align="center">
  <sub>Submitted for the VectorShift Frontend Technical Assessment · June 2026</sub>
</div>
