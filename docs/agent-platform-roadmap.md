# Agent Platform Roadmap
## From Farm Dashboard to a Reusable AI-Agent Prototyping Stack

> *"Once patterns done, should be easy to scale."*

This document maps the path from the current GreenLeaf CEA dashboard to a composable, reusable platform for rapid data product prototyping. It is organized in three tiers: **Foundation Patterns** (the three core reusable components), **Agent Layer** (wrapping those patterns as autonomous agents), and **Digital Twin Layer** (composing agents into stateful, predictive systems).

---

## Current State: What We Already Have

The farm dashboard is not just an app — it is already a rough sketch of every pattern we need. Before building anything new, understand what exists:

### Data Pipeline (`data_pipeline/export_dashboard_json.py`)
- Reads cleaned CSVs from `data/clean/`
- Fits real ML models (Ridge regression, GradientBoostingRegressor) on fleet data
- Exports structured JSON per farm, per page: `home.json`, `alert_triage.json`, `seasonal_evaluation.json`, `sustainability.json`
- Outputs portably serialized model coefficients for client-side inference (the yield simulator)

### Local LLM Layer (`lib/ollama.ts`)
- `ollamaGenerate()` — single-turn prompt → text
- `ollamaChat()` — multi-turn structured conversation, JSON format enforced
- Model fallback chain: `mistral → gemma3:4b → llama3.2 → phi4-mini → llama3.2:1b`
- `keep_alive: "30m"` keeps model resident in memory between calls
- `temperature: 0.3` for consistent, factual outputs

### Context-Aware Chat (`app/api/ollama/chat/route.ts`)
- Builds a compact JSON context from farm data (~350 tokens)
- System prompt: data + page catalog + strict JSON response schema
- Warm-up ping primes Ollama's prefix cache before the user's first question
- `parseAnswer()` validates and sanitizes model output before returning it

### React Patterns
- `useData<T>(filename)` — farm-scoped data fetching hook with caching
- `useOllama()` — generate-and-display hook
- `FarmContext` / `ChatContext` — scope + conversation state
- `Markdown` component — renders model output safely
- `OllamaInsight` — drop-in AI insight card, reusable across all pages

### What This Means
Every pattern below is an *expansion* of something already proven here. Nothing is invented from scratch.

---

## Tier 1 — Three Foundation Patterns

These are self-contained, reusable modules. Build each as a standalone template repo.

---
 
### Pattern 1: RAG on Streamlit

**Purpose:** Given any dataset (CSV, JSON, DB query result), spin up a conversational interface over it in under an hour.

**What "fast" means here:** pre-wired chunking, embedding, and retrieval — the user only supplies data and questions.

#### Architecture

```
data/                        ← CSVs, JSONs, or DB connection
  └── loader.py              ← normalize to pandas DataFrame
  └── chunker.py             ← split into embedding-sized records
  └── embedder.py            ← embed with nomic-embed-text (Ollama) or sentence-transformers
  └── store.py               ← persist to ChromaDB (local) or FAISS (in-memory)

rag/
  └── retriever.py           ← top-k similarity search
  └── prompt_builder.py      ← system prompt + retrieved context + question
  └── ollama_client.py       ← thin wrapper, reuse lib/ollama.ts pattern in Python

app.py                       ← Streamlit entrypoint
  └── sidebar: data source selector
  └── main: chat interface (st.chat_message, st.chat_input)
  └── expander: "Context used" (show retrieved chunks for trust)
```

#### Key Design Decisions
- **Ollama for embeddings** (`nomic-embed-text`) — keeps everything local, no API keys
- **ChromaDB** for persistence across sessions; FAISS for ephemeral demos
- **Chunk strategy**: for tabular data, one row ≈ one chunk with column headers prepended; for documents, 512-token windows with 64-token overlap
- **Prompt template** mirrors the farm dashboard's approach: compact context + strict schema + cite your numbers

#### Reuse from this codebase
- `data_pipeline/export_dashboard_json.py` → the `compactHome()` / `compactAlertTriage()` functions are exactly the "context compaction" step before embedding
- `lib/ollama.ts` → `ollamaChat()` with `jsonFormat: true` is the Python client's target behavior
- `app/api/ollama/chat/route.ts` → the `buildSystemPrompt()` pattern is the template

#### Template Deliverable
```
rag-streamlit-template/
  README.md          ← "drop your CSV here, run app.py"
  app.py
  rag/
  data/sample.csv    ← works out of the box
  requirements.txt   ← streamlit, chromadb, ollama, pandas
```

---

### Pattern 2: Sandboxed Execution

**Purpose:** Allow the LLM to generate and run Python code (data transforms, chart code, model training) without risking the host environment.

**Why this is essential:** Patterns 1 and 3 both eventually need the model to *run* code, not just write it.

#### Architecture

```
sandbox/
  └── executor.py            ← subprocess-based isolated runner
  └── jail.py                ← allowlist of importable modules
  └── timeout.py             ← hard kill after N seconds
  └── output_schema.py       ← typed return: {stdout, stderr, artifacts, error}

api/
  └── run_code.py            ← FastAPI endpoint: POST {code, context} → output_schema
  └── validate.py            ← AST scan before execution (block os, subprocess, socket)

artifacts/
  └── figures/               ← matplotlib/plotly saves land here
  └── dataframes/            ← CSV outputs
  └── models/                ← pickled sklearn models
```

#### Execution Flow
```
LLM generates code
  → AST validator (block dangerous imports)
  → subprocess with restricted builtins
  → timeout enforced (default: 30s)
  → stdout/stderr captured
  → artifacts collected
  → result returned to caller
```

#### Security Layers (in order)
1. **AST scan** — reject any import of `os`, `sys`, `subprocess`, `socket`, `ctypes`, `importlib`
2. **Restricted builtins** — `exec()` in a dict with only `{"__builtins__": safe_builtins}`
3. **Process isolation** — `subprocess.run()` with `timeout=` and resource limits via `resource` module
4. **Filesystem jail** — working directory is a temp dir, wiped after each run
5. **Network disabled** — `iptables` rule or `unshare --net` if running in Docker

#### Reuse from this codebase
- The farm dashboard's `data_pipeline/export_dashboard_json.py` is already the "trusted execution" side of this pattern — it runs sklearn models in a controlled pipeline. The sandbox is the *untrusted* counterpart.
- The JSON output schema (`{ok, data, error}`) mirrors `ollamaGenerate()`'s return type.

#### Template Deliverable
```
sandbox-executor-template/
  README.md
  executor.py
  api/run_code.py
  tests/test_executor.py     ← tests for escape attempts
  requirements.txt           ← fastapi, uvicorn, astpretty
```

---

### Pattern 3: Streamlit Dashboard Generation

**Purpose:** Given a dataset and a question ("show me profitability over time"), generate a complete, runnable Streamlit page.

**This is the pattern the dashboard already almost does** — the chat gives you the answer; this pattern gives you the *page*.

#### Architecture

```
generator/
  └── schema_inferrer.py     ← infer column types, distributions, suggested charts
  └── prompt_builder.py      ← dataset schema + question + chart library docs → prompt
  └── code_generator.py      ← call LLM, extract ```python block
  └── validator.py           ← run through sandbox (Pattern 2), check for import errors
  └── renderer.py            ← write to pages/{slug}.py, reload Streamlit

app.py                       ← host app
  └── sidebar: upload data, type question
  └── main: generated page rendered via st.components or iframe
  └── expander: "Generated code" (show + edit + regenerate)
```

#### Prompt Engineering (critical)

The prompt must be highly constrained for reliable output. Template:

```
You are a Streamlit dashboard code generator.

DATASET SCHEMA:
{schema}   ← column names, dtypes, 5-row sample, null counts

USER QUESTION: "{question}"

RULES:
- Use only: streamlit, pandas, plotly.express, altair
- Data is already loaded as `df` (pandas DataFrame)
- Output ONLY a Python code block, no explanation
- Every chart must have a title
- Handle empty data gracefully

Generate a complete Streamlit page that answers the question.
```

#### Two-Pass Generation
1. **First pass**: generate code → run through sandbox → if it errors, send error back to LLM for self-correction (max 2 retries)
2. **Second pass** (optional): ask a second LLM call to review the generated code for correctness before showing user

#### Reuse from this codebase
- `components/Markdown.tsx` → `renderer.py` (display generated code with syntax highlighting)
- `app/api/ollama/chat/route.ts`'s `parseAnswer()` → `code_generator.py`'s code block extractor
- `data_pipeline/export_dashboard_json.py`'s schema inference → `schema_inferrer.py`
- The `OllamaInsight` component's regenerate button → UI pattern for "regenerate page"

#### Template Deliverable
```
dashboard-generator-template/
  README.md
  app.py
  generator/
  sandbox/               ← import Pattern 2 as submodule
  sample_data/profits.csv
  requirements.txt
```

---

## Tier 2 — Agent Layer

Each pattern becomes an **agent** — a callable unit with a defined input/output contract, a system prompt, tools it can invoke, and a retry/fallback policy.

This is the architectural shift: instead of calling functions directly, you describe a *goal* to an agent and it decides *how* to achieve it using the patterns as tools.

### Agent Architecture (shared interface)

```python
class Agent:
    name: str
    system_prompt: str
    tools: list[Tool]          # each Tool wraps a Pattern
    model: str                 # ollama model name
    memory: ConversationBuffer # last N turns
    max_iterations: int        # prevent infinite loops

    def run(self, goal: str, context: dict) -> AgentResult
```

### The Three Agents

#### RAG Agent
- **Goal**: "Answer questions about this dataset"
- **Tools**: `retrieve_chunks()`, `format_answer()`
- **Input**: dataset path + question
- **Output**: `{answer, sources, confidence}`

#### Execution Agent
- **Goal**: "Transform/analyze this data by running code"
- **Tools**: `generate_code()`, `run_in_sandbox()`, `fix_error()`
- **Input**: dataset + transformation description
- **Output**: `{code, result_df, figures, error}`
- **Self-healing**: on sandbox error → sends `{code, error}` back to LLM for correction

#### Dashboard Agent
- **Goal**: "Build a Streamlit page that visualizes this"
- **Tools**: `infer_schema()`, `generate_page()`, `validate_page()`, `write_page()`
- **Input**: dataset + user question
- **Output**: `{page_code, preview_url, regenerate_fn}`

### Agent Orchestration (multi-agent)

```
User: "Give me a profitability dashboard for this farm data"
                    ↓
         Orchestrator Agent
         (decides which agents to invoke)
                    ↓
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
 RAG Agent    Execution Agent  Dashboard Agent
 (summarize   (compute KPIs    (generate the
  the data)    from raw CSV)    Streamlit page)
    ▓               ▓               ▓
    └───────────────┼───────────────┘
                    ▼
         Merged result → user
```

The orchestrator is just another LLM call with a system prompt that describes available agents and their capabilities — the same `ollamaChat()` pattern, with the agent list as the "page catalog."

### Reuse from this codebase
- `app/api/ollama/chat/route.ts` is already an orchestrator: it receives a question, decides what context to build, calls the LLM, validates output, and returns a structured result
- `ChatContext.tsx`'s `send()` function is the client-side orchestration loop
- `MODEL_FALLBACK_CHAIN` becomes the agent's model selection policy

---

## Tier 3 — Digital Twin Layer

Agents compose into a **digital twin**: a live, queryable model of a real system that can replay history, answer "what if", and project forward.

### Digital Twin Architecture

```
twin/
  └── state_machine.py       ← current state of the system (plots, alerts, KPIs)
  └── event_log.py           ← append-only history of all state changes
  └── simulator.py           ← advance state forward given actions/conditions
  └── projection.py          ← fit lightweight ML models, project N steps ahead

api/
  └── twin_router.py         ← FastAPI: CRUD on twin state, query, simulate
  └── snapshot.py            ← serialize full twin state to JSON (portable)

visualizer/
  └── app.py                 ← Streamlit: live twin state + timeline + projections
  └── generated_pages/       ← Dashboard Agent output lands here
```

### State Machine Design

```
State = {
  scope_id: str,             # farm/greenhouse/plot
  timestamp: datetime,
  kpis: {health, alerts, roi, stress},
  events: [
    {type: alert|action|measurement, payload, actor}
  ],
  model_params: {            # portable ML coefficients (like yield simulator)
    yield_model: {terms, coefficients, intercept},
    stress_model: {...}
  }
}
```

### Reuse from this codebase
- `data_pipeline/export_dashboard_json.py` already serializes ML model coefficients (Ridge regression terms) into portable JSON — this is the `model_params` schema
- `public/data/{farm}/home.json` is already a state snapshot — the twin is just this made mutable and time-indexed
- `components/StressOutcomeSimulator.tsx` and `components/YieldSimulator.tsx` are already client-side digital twin projections — move the math server-side
- `FarmContext.tsx`'s scope hierarchy (`all → farm → greenhouse → plot`) is the twin's entity graph

### Progression

```
Step 1: Static Twin
  ← Current dashboard state. Read-only JSON snapshots.
  Already done: public/data/{farm}/*.json

Step 2: Mutable Twin
  ← Add write API. State changes persist. Event log starts.
  New: twin_router.py, event_log.py

Step 3: Simulated Twin
  ← Given an action ("reduce crew response time by 1 day"),
    advance state and show projected KPI delta.
  Already sketched: StressOutcomeSimulator, YieldSimulator

Step 4: ML Twin
  ← Replace rule-based simulation with trained models.
    Models retrain nightly from new data.
  Already sketched: GradientBoostingRegressor in export_dashboard_json.py

Step 5: Agent-Driven Twin
  ← Agents can read and write twin state.
    "Find the intervention that maximizes ROI" → Execution Agent
    "Show me what this looks like" → Dashboard Agent
    "Explain the recommendation" → RAG Agent
```

---

## Implementation Sequence

Given the existing codebase as the starting point, the recommended order:

| Phase | Deliverable | Effort | Unlocks |
|---|---|---|---|
| **0** | This dashboard running cleanly | Done ✅ | Reference implementation |
| **1a** | `rag-streamlit-template` | ~2 days | Fast data Q&A on any dataset |
| **1b** | `sandbox-executor-template` | ~2 days | Safe code execution |
| **1c** | `dashboard-generator-template` | ~3 days | AI-generated dashboards |
| **2** | Agent wrappers for 1a/1b/1c | ~2 days | Composable, orchestratable units |
| **3a** | Mutable twin API + event log | ~3 days | Stateful system model |
| **3b** | ML projection layer | ~3 days | Forecasting and what-if |
| **3c** | Agent-driven twin | ~2 days | Natural language control of twin |

Total: ~17 days of focused work for the full stack.

---

## Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| LLM | Ollama (mistral, gemma3:4b) | Local, no API cost, proven in this codebase |
| Embeddings | `nomic-embed-text` via Ollama | Same local model server |
| Vector store | ChromaDB | Persistent, no infra, Python-native |
| Dashboard UI | Streamlit | Fast iteration, Python-native, no frontend build step |
| Production UI | Next.js (this codebase) | When polish matters |
| Sandboxing | Python subprocess + AST | No Docker required for prototyping |
| State persistence | SQLite → Postgres | SQLite for single-user, Postgres when shared |
| ML | scikit-learn | Already used in data pipeline |
| API | FastAPI | Thin, typed, async — same mental model as Next.js API routes |

---

## The Core Reuse Principle

Every new pattern should expose the same interface:

```python
def run(goal: str, context: dict, data: Any) -> dict:
    """
    goal:    what the user/agent wants
    context: metadata about the request (scope, farm, session)
    data:    the actual data to work with
    returns: {ok, result, error, metadata}
    """
```

This mirrors `ollamaGenerate()` and `ollamaChat()` in `lib/ollama.ts` — the same `{ok, result, error}` shape that already flows through the entire farm dashboard. When everything speaks the same language, composition is trivial.

---

## Cloud Deployment: Google Cloud Run

The app is stateless, reads only from bundled static JSON, and exposes a single HTTP server — a natural fit for Cloud Run. The one non-trivial piece is Ollama: it runs as a local process in dev but must become a separate networked service in production.

---

### What Changes for Cloud

| Concern | Dev (local) | Cloud Run |
|---|---|---|
| Next.js server | `next dev` | `next start` (production build) |
| Port | 3000 | `$PORT` (injected by Cloud Run, default 8080) |
| Ollama | `localhost:11434` | Separate Cloud Run service or GCE VM |
| Static data | `public/data/` in repo | Baked into container image |
| Secrets | none | `OLLAMA_BASE` via Secret Manager or env var |

---

### Step 1 — Enable standalone output in Next.js

Cloud Run containers must be self-contained. Next.js `output: 'standalone'` produces a minimal `server.js` with only the files needed to run — no `node_modules` copied wholesale.

**`farm-dashboard/next.config.ts`:**
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

After `npm run build`, the runnable artifact is in `.next/standalone/`. It includes a `server.js` that respects the `PORT` and `HOSTNAME` env vars Cloud Run provides.

---

### Step 2 — Dockerfile

Place this at `farm-dashboard/Dockerfile`. It uses a multi-stage build: `builder` installs deps and compiles; `runner` copies only what's needed to run.

```dockerfile
# ── Stage 1: build ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: run ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# standalone output + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
```

**Build and test locally:**
```bash
cd farm-dashboard
docker build -t greenleaf-dashboard .
docker run -p 8080:8080 -e OLLAMA_BASE=http://host.docker.internal:11434 greenleaf-dashboard
```

---

### Step 3 — Deploy Ollama on Cloud Run (GPU)

Cloud Run supports NVIDIA L4 and T4 GPUs. Deploying Ollama this way keeps the architecture fully serverless — no VMs to manage.

```bash
# Build and push the official Ollama image
gcloud run deploy ollama \
  --image ollama/ollama \
  --region us-central1 \
  --cpu 8 \
  --memory 32Gi \
  --gpu 1 \
  --gpu-type nvidia-l4 \
  --no-allow-unauthenticated \
  --set-env-vars OLLAMA_MODELS=/models \
  --add-volume name=models,type=cloud-storage,bucket=YOUR_MODELS_BUCKET \
  --add-volume-mount volume=models,mount-path=/models
```

Pull models into the GCS bucket once, then all Ollama instances load from it on startup:
```bash
# Run locally against the deployed service to pull models into the bucket
ollama pull mistral
ollama pull gemma3:4b
```

> **Cheaper alternative:** A single `e2-standard-8` GCE VM with Ollama running as a systemd service costs ~$140/mo and handles multiple apps sharing the same model server. Use this during prototyping; migrate to Cloud Run GPU when you need autoscaling.

---

### Step 4 — Deploy the Next.js app to Cloud Run

```bash
# Push image to Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev
docker tag greenleaf-dashboard us-central1-docker.pkg.dev/YOUR_PROJECT/greenleaf/dashboard:latest
docker push us-central1-docker.pkg.dev/YOUR_PROJECT/greenleaf/dashboard:latest

# Deploy
gcloud run deploy greenleaf-dashboard \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT/greenleaf/dashboard:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars OLLAMA_BASE=https://ollama-SERVICE_URL \
  --set-env-vars NEXT_TELEMETRY_DISABLED=1
```

The `OLLAMA_BASE` env var is already wired in `lib/ollama.ts`:
```ts
export const OLLAMA_BASE = process.env.OLLAMA_BASE ?? "http://127.0.0.1:11434";
```
No app code changes needed — just set the env var to point at your deployed Ollama service URL.

---

### Step 5 — Lock down Ollama (service-to-service auth)

The Ollama Cloud Run service should not be public. Use Cloud Run's built-in IAM auth:

```bash
# Give the dashboard's service account permission to call Ollama
gcloud run services add-iam-policy-binding ollama \
  --region us-central1 \
  --member serviceAccount:dashboard-sa@YOUR_PROJECT.iam.gserviceaccount.com \
  --role roles/run.invoker
```

Then update `lib/ollama.ts` to attach an identity token to every Ollama request. Add a helper:

```ts
// lib/gcpAuth.ts — only runs server-side (API routes)
export async function getIdentityToken(audience: string): Promise<string | null> {
  if (!process.env.OLLAMA_BASE?.startsWith("https://")) return null;
  try {
    const res = await fetch(
      `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${audience}`,
      { headers: { "Metadata-Flavor": "Google" } }
    );
    return res.ok ? res.text() : null;
  } catch {
    return null; // not running on GCP — local dev, skip auth
  }
}
```

Then in `ollamaGenerate()` and `ollamaChat()`, add the token as an `Authorization` header when present. This is the only code change needed in the app for production auth.

---

### Deployment Architecture Diagram

```
Browser
  │
  ▼
Cloud Run: greenleaf-dashboard  (Next.js, 1 vCPU, 1 GB)
  │  serves static pages + API routes
  │  reads public/data/*.json from container image
  │
  ├── GET /api/ollama-check  ──────────────────────────────►  Cloud Run: ollama
  ├── POST /api/ollama       ── ollamaGenerate() ──────────►  (8 vCPU, 32 GB, 1x L4 GPU)
  └── POST /api/ollama/chat  ── ollamaChat()     ──────────►  mistral / gemma3:4b
```

---

### Cost Estimate (production, low-traffic)

| Service | Spec | Est. monthly |
|---|---|---|
| Cloud Run: dashboard | 1 vCPU / 1 GB, ~1000 req/day | ~$5 |
| Cloud Run: Ollama | 8 vCPU / 32 GB / L4 GPU, min 1 instance | ~$500 |
| GCS: model storage | ~15 GB (mistral + gemma3:4b) | ~$0.30 |
| **Total** | | **~$505/mo** |

> For dev/demo use: set Ollama Cloud Run `--min-instances 0` (cold starts ~30s) and cost drops to ~$50/mo. For a private internal tool on a budget, the single GCE VM alternative (~$140/mo) is the most pragmatic choice.

---

### `.dockerignore`

Place at `farm-dashboard/.dockerignore` to keep the image lean:

```
node_modules
.next
.git
data_pipeline
*.md
.env*
```

---

### CI/CD sketch (Cloud Build)

`cloudbuild.yaml` at repo root:

```yaml
steps:
  - name: node:20-alpine
    dir: farm-dashboard
    entrypoint: npm
    args: [ci]
  - name: node:20-alpine
    dir: farm-dashboard
    entrypoint: npm
    args: [run, build]
  - name: gcr.io/cloud-builders/docker
    args: [build, -t, "$_IMAGE", farm-dashboard]
  - name: gcr.io/cloud-builders/docker
    args: [push, "$_IMAGE"]
  - name: gcr.io/google.com/cloudsdktool/cloud-sdk
    args:
      - gcloud
      - run
      - deploy
      - greenleaf-dashboard
      - --image=$_IMAGE
      - --region=us-central1
substitutions:
  _IMAGE: us-central1-docker.pkg.dev/$PROJECT_ID/greenleaf/dashboard:$COMMIT_SHA
```

Trigger on push to `main`. The data pipeline (`data_pipeline/export_dashboard_json.py`) runs separately on a schedule — its JSON output is committed to the repo and baked into the container image at build time.
