# Dependency & Runtime Fixes
> Changes made to get the app running from a broken state. Intended for the original authors as a handoff record.

---

## Context

Running `npm audit fix --force` in `farm-dashboard/` had force-upgraded Next.js to `16.2.6` (an unstable alpha release). This caused a fatal Turbopack panic on every page load. The app was non-functional. The following changes were made to restore it.

---

## 1. Next.js downgraded to stable (`16.2.6` → `15.5.18`)

**File:** `farm-dashboard/package.json`

`npm audit fix --force` picked `16.2.6` as the "fix" for a `postcss < 8.5.10` advisory. That version is not a stable release — its Turbopack build worker crashes with a fatal panic on every request.

`15.5.18` is the latest stable Next.js release. It:
- Resolves the postcss vulnerability (bundled postcss ≥ 8.5.10)
- Fully supports React 19.2.4
- Has stable Turbopack (opt-in via `--turbopack`) and webpack

`eslint-config-next` must always match the Next.js version, so it was updated in step.

```diff
- "next": "^16.2.6",
+ "next": "15.5.18",

- "eslint-config-next": "16.2.6",
+ "eslint-config-next": "15.5.18",
```

> **Note on the remaining `npm audit` report:** After this fix, `npm audit` still flags `next` for the postcss advisory. This is an advisory tracking lag — the advisory range was defined before `15.x` patched it, and npm's advisory database hasn't been updated. The vulnerability is not present. Do **not** run `npm audit fix --force` again; it will re-introduce the broken alpha.

---

## 2. `@tailwindcss/postcss` pinned to `4.1.10` (`4.3.0` → `4.1.10`)

**File:** `farm-dashboard/package.json`

`@tailwindcss/postcss@4.3.0` and `tailwindcss@4.3.0` ship a native Rust/Oxide binary (`tailwindcss-oxide.linux-x64-gnu.node`) that crashes with `SIGBUS` when Turbopack spawns it as a PostCSS worker process on this machine. The crash happens during CSS processing of `app/globals.css`, making every page return 500.

`4.1.10` ships an older Oxide binary that processes `globals.css` correctly (tested: 56 KB of generated CSS, no crash).

```diff
- "@tailwindcss/postcss": "^4",
+ "@tailwindcss/postcss": "^4.1.10",

- "tailwindcss": "^4",
+ "tailwindcss": "^4.1.10",
```

---

## 3. `@reduxjs/toolkit` added as an explicit dependency

**File:** `farm-dashboard/package.json`

`recharts@3.x` (already in `dependencies`) added an undeclared peer dependency on `@reduxjs/toolkit` for its internal Redux store (`brushSlice.js`). This was not in `package.json`, so it was missing from `node_modules`, causing a module-not-found build error on any page that uses a chart.

Additionally, the first install produced a corrupted `@reduxjs/toolkit` package (`.mjs` dist files missing, only sourcemaps present). The package was removed and cleanly reinstalled.

```diff
+ "@reduxjs/toolkit": "^2.12.0",
```

---

## 4. Ollama installed and started

Ollama (local LLM runtime) was not installed in the environment. The GreenLeaf AI chat and insight cards depend on it. Steps taken:

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama serve &   # start the API server on http://127.0.0.1:11434
```

Models pulled (in fallback priority order):

| Model | Size | Role |
|---|---|---|
| `mistral` | 4.4 GB | Primary — best JSON instruction-following |
| `gemma3:4b` | 3.3 GB | First fallback |
| `llama3.2:1b` | 1.3 GB | Last resort |

**File:** `farm-dashboard/lib/ollama.ts` — `MODEL_FALLBACK_CHAIN` reordered so stronger models are tried first:

```diff
- "llama3.2",
- "llama3.2:1b",
- "gemma3:4b",
- "mistral",
- "phi4-mini",
+ "mistral",
+ "gemma3:4b",
+ "llama3.2",
+ "phi4-mini",
+ "llama3.2:1b",
```

> Ollama must be running for AI features to work. After a codespace restart: `ollama serve &`. No need to re-pull models.

---

## 5. Chat system prompt fixed — LLM was outputting literal `<light markdown>` tags

**File:** `farm-dashboard/app/api/ollama/chat/route.ts`

The system prompt instructed the model to respond with:
```
{"answer": "<your answer in light markdown>", ...}
```

Smaller models (e.g. `llama3.2:1b`) interpreted `light markdown` as an HTML tag name and wrapped navigation suggestions in `<light markdown>View alert triage</light markdown>` literally. The prompt was rewritten to use a concrete example instead of placeholder angle-bracket notation:

```diff
- Respond with ONLY a JSON object, no markdown fences, of this exact shape:
- {"answer": "<your answer in light markdown>", "link": {"label": "<short button label, e.g. 'View alert triage'>", "href": "<one href from the list>"} | null}
- Set "link" to null when no page is clearly relevant. Never use an href that is not in the list above.
+ Respond with ONLY a valid JSON object — no markdown fences, no extra keys. Use exactly this shape:
+ {"answer": "your plain-text response (bold with **word**, italic with *word*)", "link": {"label": "short button text", "href": "/exact-href"} | null}
+ Example: {"answer": "Health score is 78. Three plots need attention.", "link": {"label": "View alert triage", "href": "/alert-triage"}}
+ Set "link" to null when no page is clearly relevant. Never use an href not in the list above. Never output HTML tags.
```

---

## 6. Hydration mismatch fixed in `AlertTriagePage`

**File:** `farm-dashboard/components/AlertTriagePage.tsx`

`new Date().toLocaleDateString("en-US", { weekday: "long" })` was called directly during render to display today's day name ("It's Monday. You have limited crew."). Because the server renders in UTC and the browser renders in the user's local timezone, the day name can differ — causing a React hydration mismatch error in the browser console.

Fixed by initializing `dayName` as an empty string and populating it client-side in a `useEffect`:

```diff
- const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
+ const [dayName, setDayName] = useState("");
+ useEffect(() => {
+   setDayName(new Date().toLocaleDateString("en-US", { weekday: "long" }));
+ }, []);
```

---

## 7. `suppressHydrationWarning` added to `<html>` in root layout

**File:** `farm-dashboard/app/layout.tsx`

A separate hydration warning was being logged because a Google Analytics Opt-out browser extension injects `data-google-analytics-opt-out=""` onto the `<html>` element before React hydrates. React detects the attribute in the DOM but not in the virtual DOM and logs it.

`suppressHydrationWarning` on `<html>` tells React to accept this mismatch without attempting to patch the DOM. This is the [React-recommended approach](https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors) for extension-injected attributes on the root element.

```diff
  <html
    lang="en"
    className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
+   suppressHydrationWarning
  >
```

> **Note (React 19):** React 19 changed hydration error handling — even with `suppressHydrationWarning`, a `console.error` is still emitted (the DOM is not patched, but the log appears). This is a React 19 behavior change from React 18 where it was fully silent. The app is unaffected. To stop seeing the log, disable the browser extension for `localhost`.

---

## Dev server startup

The app is started with Turbopack (webpack's build worker crashes with SIGBUS due to the same Oxide binary issue as PostCSS):

```bash
cd farm-dashboard
NEXT_TELEMETRY_DISABLED=1 npx next dev --turbopack
```

All five routes confirmed working: `/`, `/alert-triage`, `/seasonal-evaluation`, `/sustainability`, `/stress-simulator`.
