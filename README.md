# GreenLeaf Farm Dashboard

Interactive dashboard for GreenLeaf CEA greenhouse operations: seasonal evaluation, alert triage, sustainability metrics, and stress simulation. The web app lives in **`farm-dashboard/`**; farm data and Python pipelines live at the repo root.

## Prerequisites

- **Node.js 18+** (20 LTS recommended). Check with `node -v`.
- **npm** (included with Node).

You do **not** need Python to run the dashboard locally. Pre-built JSON under `farm-dashboard/public/data/` is already committed.

## Quick start

From the repository root:

```bash
cd farm-dashboard
npm install
npm run dev
```

- **`npm install`** — run once on first clone (or after `package.json` changes).
- **`npm run dev`** — starts the Next.js dev server.

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production build (optional)

```bash
cd farm-dashboard
npm run build
npm start
```

The app is served on port **3000** by default (`npm start`).

## Ollama (optional, for AI features)

The dashboard works without AI. Charts, KPIs, farm selector, and all static views use bundled JSON data.

**Ollama** (local LLM) powers:

- **AI overview** — auto-generated executive summary on the home page
- **Farm chat** — the GreenLeaf AI assistant overlay

### How to enable AI features

1. Install [Ollama](https://ollama.com/download) and ensure it is running (tray app or `ollama serve`).
2. Pull a model the app recognizes, e.g. `ollama pull llama3.2` (or use the Ollama app to download **llama3.2**).
3. With the dev server running, verify: [http://localhost:3000/api/ollama-check](http://localhost:3000/api/ollama-check) should return `ok: true` and list installed models.
4. Optional: set `OLLAMA_BASE=http://127.0.0.1:11434` in `farm-dashboard/.env.local` if Ollama runs on a non-default host/port.

Without Ollama, the rest of the app behaves normally; AI actions show an error when you try to use them.

## npm scripts

Run these from **`farm-dashboard/`**:

| Command | Description |
|--------|-------------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run data:export` | Regenerate `public/data/` from CSVs (see below) |

## Regenerating dashboard data (optional)

If you change files under `data/clean/`, you can rebuild the JSON the app reads:

```bash
cd farm-dashboard
npm run data:export
```

This runs `data_pipeline/export_dashboard_json.py` and requires **Python 3** with `pandas`, `numpy`, and `scikit-learn`. The script reads from `data/clean/` at the repo root and writes to `farm-dashboard/public/data/`. You do not need to run this for a normal demo—the exported files are already in the repo.

## Repository layout

| Path | Purpose |
|------|---------|
| `farm-dashboard/` | Next.js app (UI, API routes, charts) |
| `farm-dashboard/public/data/` | Per-farm JSON consumed by the UI |
| `data/` | Source CSVs and cleaning scripts |
| `docs/` | PRD, datasets, and case notes |

## App routes

| URL | Page |
|-----|------|
| `/` | Home — fleet overview and plot health |
| `/seasonal-evaluation` | Seasonal evaluation & resource efficiency |
| `/alert-triage` | Alert triage |
| `/sustainability` | Sustainability metrics |
| `/stress-simulator` | Stress outcome simulator |

Use the sidebar to switch farms (F01–F08) and use cases.

## Troubleshooting

- **`npm install` fails** — Use Node 18+; delete `farm-dashboard/node_modules` and `package-lock.json`, then run `npm install` again only if needed.
- **Port 3000 in use** — Stop the other process or run `npx next dev -p 3001` and open the port you chose.
- **AI errors** — Confirm Ollama is running (`http://127.0.0.1:11434`), at least one model is installed (`ollama pull llama3.2`), and `/api/ollama-check` returns `ok: true`.
- **Blank or stale charts** — Hard-refresh the browser; if you ran `data:export`, check the terminal for Python errors.
