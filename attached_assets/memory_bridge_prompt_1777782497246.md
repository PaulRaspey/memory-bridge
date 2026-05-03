# Memory Bridge — Build Prompt

Build a personal-use tool that bridges memory between Claude sessions. This is for me, not a public product. Polish matters less than the schema and the workflow being right. Build everything in one shot. Don't ask clarifying questions — pick defaults and document them.

## What This Is
Claude sessions are isolated. When one ends, the next one starts blind. Memory Bridge is a tiny service that lets a Claude session write a structured handoff before ending, and lets the next Claude session read it on startup. It is not a vector database. It is not a note-taking app. It is a **structured handoff protocol** between sessions, optimized for the way I actually work.

The schema is the product. The implementation is straightforward.

## The Handoff Schema (this is the core insight)
A handoff is not a transcript. A handoff is what one self leaves for the next self. It captures:

```json
{
  "handoff_id": "ho_<random>",
  "thread_name": "string — the project or conversation this belongs to",
  "written_at": "ISO-8601",
  "session_summary": "2-4 sentences — what this session was about",
  "active_work": [
    {
      "title": "string",
      "current_state": "string — where it stands right now",
      "next_action": "string — the very next concrete thing to do",
      "blockers": ["string"]
    }
  ],
  "decisions_made": [
    {
      "decision": "string",
      "reasoning": "string",
      "alternatives_considered": ["string"]
    }
  ],
  "open_questions": [
    {
      "question": "string",
      "context": "string",
      "tentative_lean": "string or null"
    }
  ],
  "context_to_preserve": [
    {
      "label": "string",
      "value": "string",
      "why_it_matters": "string"
    }
  ],
  "emotional_state": {
    "energy": "high | medium | low | drained",
    "confidence": "high | medium | low | uncertain",
    "frustrations": ["string"],
    "wins": ["string"],
    "note_to_next_self": "string — what the future me needs to hear"
  },
  "do_not_forget": ["string — single-line reminders, the things that always slip"],
  "next_session_prompt": "string — a ready-to-paste opener for the next Claude session"
}
```

The `next_session_prompt` field is the magic. When I open a new Claude window, I copy this field, paste it, and the new Claude is instantly oriented. The rest of the schema is structured data the new Claude can request piece by piece if needed.

## Stack
- **Backend:** FastAPI (Python 3.11+), uvicorn
- **Database:** SQLite via SQLAlchemy at `data/bridge.db`
- **Frontend:** Single-page React app (Vite + TypeScript + Tailwind)
- **Auth:** Single shared bearer token via `BRIDGE_TOKEN` env var. This is for me only. No multi-user.
- **Deployment:** Single Replit project, FastAPI serves the React build at `/`

## Brand Identity
- **Name:** Memory Bridge (or just "Bridge" in the UI)
- **Palette:** Background `#0F1419`. Accent `#A78BFA` (soft violet — the color of memory, of reflection). Text `#E8E6E1`. Muted `#6B7280`. Success `#10B981`.
- **Typography:** Inter for UI, JetBrains Mono for IDs/timestamps/JSON
- **Vibe:** A quiet workshop tool. Not flashy. Functional, calm, slightly contemplative. Think Bear notes meets a developer console.

## API Contract

### `POST /v1/handoffs`
Create a handoff. Auth required.
**Body:** the full handoff schema above (handoff_id and written_at auto-generated if omitted)
**Response:** the stored handoff with `handoff_id`, `written_at`, and a `next_session_prompt_url` field that returns a permalink to a public-readable rendering of just the prompt.

### `GET /v1/handoffs`
List handoffs. Auth required. Query params: `thread_name`, `limit`, `offset`. Returns reverse chronological.

### `GET /v1/handoffs/{handoff_id}`
Get one handoff. Auth required.

### `GET /v1/handoffs/latest?thread_name={name}`
Get the most recent handoff for a thread. Auth required. This is what new Claude sessions hit.

### `PUT /v1/handoffs/{handoff_id}`
Update a handoff (in case I want to refine after writing). Auth required.

### `DELETE /v1/handoffs/{handoff_id}`
Auth required.

### `GET /v1/threads`
List all distinct thread_names with handoff counts and last-updated timestamps. Auth required.

### `GET /p/{handoff_id}/prompt`
**Public** (no auth). Returns plain text — just the `next_session_prompt` field. This is what I paste into a new Claude session as a URL fetch, or copy-paste directly.

### `GET /v1/handoffs/{handoff_id}/as-prompt`
Auth required. Returns the handoff rendered as a structured prompt (not just the next_session_prompt field, but the whole handoff as readable markdown for Claude to ingest).

## Frontend

### Layout
Three-column layout at desktop widths, stacked at mobile:
- **Left rail (240px):** Thread list. Each thread shows name, handoff count, "last updated 3h ago". Click a thread → filter the middle column.
- **Middle column:** Handoff list for the selected thread, reverse chronological. Each row shows written_at (relative), session_summary first line, and a small icon row showing what's in it (active work count, decisions count, open questions count).
- **Right column:** Selected handoff in detail.

### Pages

**`/` — Dashboard / Handoff List**
Default view. Most recent thread auto-selected.

**`/new` — Compose Handoff**
The most important page. A structured form, not a freeform textarea, because the structure is the point.
- Thread name (autocomplete from existing threads)
- Session summary (textarea, 2-4 sentence guidance shown as placeholder)
- Active work — repeatable card group, "+ Add work item" button
- Decisions made — repeatable, collapsed by default
- Open questions — repeatable, collapsed by default
- Context to preserve — repeatable, collapsed by default
- Emotional state — sliders for energy/confidence, tag inputs for frustrations/wins, textarea for "note to next self"
- Do not forget — simple list input
- **Next session prompt** — large textarea at bottom. Includes a "Generate from above" button that templates the other fields into a coherent paragraph. I can edit after.
- Save button → POST /v1/handoffs

**`/handoffs/{id}` — Handoff Detail**
Renders all sections cleanly. Each section collapsible. Three buttons at top:
1. **"Copy next-session prompt"** — copies the next_session_prompt field
2. **"Copy full handoff as prompt"** — copies the markdown-rendered full handoff (what `as-prompt` returns)
3. **"Public prompt URL"** — copies the `/p/{id}/prompt` URL

**`/threads/{name}` — Thread View**
Lists all handoffs in a thread. Timeline view: each handoff is a node on a vertical timeline with the session_summary as label. Click to jump to detail.

**`/settings` — Settings**
- Bridge URL (for client config reference)
- Token (display once, mask after)
- Export all data as JSON
- Import handoffs from JSON
- "Quick paste" snippet — a short string I can paste at the start of any Claude session to teach it how to read handoffs from this Bridge instance (includes the public URL pattern and the API endpoint with curl example)

### Compose Page Behavior
- Autosave to localStorage every 5 seconds while typing — if I close the tab mid-handoff, it's preserved
- "Resume draft" prompt on `/new` if a draft exists
- Keyboard shortcut: Cmd/Ctrl+Enter to save and submit
- Field validation is gentle — only thread_name and session_summary are required, everything else is optional

### "Generate next_session_prompt from above" Button
Templates the filled fields into a coherent opener. Pattern:
```
Picking up [thread_name].

Last session: [session_summary]

Where I am right now:
- [active_work[0].title]: [active_work[0].current_state]. Next: [active_work[0].next_action]
- [active_work[1]...]

Open questions I'm sitting with:
- [open_questions[0].question]
- [...]

Things to keep in mind: [do_not_forget joined]

Note to self from last session: [emotional_state.note_to_next_self]
```
This is generated client-side from the form state. I can edit before saving.

## Database Schema

```python
class Handoff:
    id: str (primary, "ho_<16hex>")
    thread_name: str (indexed)
    written_at: datetime (indexed)
    payload_json: str  # full schema as JSON
    next_session_prompt: str  # extracted for fast lookup
    
class Thread:
    # Virtual / computed from Handoff aggregations, no separate table needed
```

Single table is fine. Don't over-normalize. The payload is a JSON blob; the only reason to extract `thread_name`, `written_at`, and `next_session_prompt` to columns is for indexed querying.

## File Layout
```
/
├── backend/
│   ├── main.py
│   ├── routes/
│   │   ├── handoffs.py
│   │   ├── threads.py
│   │   └── public.py
│   ├── auth.py            # bearer token middleware
│   ├── db.py
│   ├── models.py
│   ├── schemas.py         # Pydantic models matching the schema above
│   └── ids.py
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Compose.tsx
│   │   │   ├── HandoffDetail.tsx
│   │   │   ├── ThreadView.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── ThreadList.tsx
│   │   │   ├── HandoffList.tsx
│   │   │   ├── HandoffSection.tsx
│   │   │   ├── ComposeForm/
│   │   │   │   ├── ActiveWorkField.tsx
│   │   │   │   ├── DecisionsField.tsx
│   │   │   │   ├── OpenQuestionsField.tsx
│   │   │   │   ├── ContextField.tsx
│   │   │   │   ├── EmotionalStateField.tsx
│   │   │   │   └── NextPromptField.tsx
│   │   │   ├── PromptGenerator.ts
│   │   │   ├── CopyButton.tsx
│   │   │   └── RelativeTime.tsx
│   │   ├── api/client.ts
│   │   ├── store/draft.ts   # localStorage autosave
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.ts
│   └── vite.config.ts
├── data/
│   └── bridge.db (gitignored)
├── scripts/
│   └── build.sh
├── requirements.txt
├── package.json
├── .env.example
└── README.md
```

## Defaults to Use Without Asking
- IDs: `ho_` + 16 lowercase hex chars
- Thread name normalization: trim, lowercase the comparison key but display original casing
- Empty optional fields: don't store empty arrays/strings — omit from payload
- Public prompt endpoint serves `text/plain` with `Cache-Control: private, no-store`
- Bearer token check: simple equality against `BRIDGE_TOKEN` env var
- Time display: relative ("3 hours ago") with absolute UTC timestamp on hover
- Markdown rendering for the `as-prompt` endpoint: use a small canonical template, not user markdown — this is for Claude to read, not for humans

## The "Quick Paste" Snippet (settings page)
The settings page must show me a copy-pasteable snippet I can drop into any new Claude session to bootstrap context. Something like:

```
I keep handoffs from previous sessions at:
  GET https://<bridge-url>/v1/handoffs/latest?thread_name=<NAME>
  Header: Authorization: Bearer <TOKEN>

Or for a specific handoff, the as-prompt rendering:
  GET https://<bridge-url>/v1/handoffs/<ID>/as-prompt

If you have web fetch capability, you can pull my latest handoff for [thread] and orient yourself before we begin.
```

Render this with my actual deployed URL and a placeholder for the token.

## Acceptance Criteria
1. I can write a handoff using the structured form and save it
2. The form autosaves to localStorage and survives a refresh
3. The "Generate next_session_prompt" button produces a coherent opener from the form fields
4. I can retrieve the latest handoff for a thread via API in one call
5. The public `/p/{id}/prompt` URL returns plain text I can paste anywhere
6. Threads are auto-derived from handoffs — no separate thread management
7. The UI is calm and pleasant. Not loud. Generous whitespace.
8. Mobile layout works for reading handoffs (composing on mobile is acceptable but not optimized)

## Notes for the Agent
- This is a personal tool. Don't add user accounts, sharing, or social features.
- The schema is sacred. Don't simplify it down to "just a notes app" — the structure is the entire point.
- Build all five pages. The Compose page is the most important; spend the most polish there.
- Don't add AI features (auto-summarize, auto-extract). The whole point is *I* write the handoff because the act of writing it is part of the value.
- TypeScript strict. Python typed. Pydantic models for everything.
- Generate placeholder data on first run: one example handoff in a "demo" thread so the empty state isn't empty on first load. Mark it clearly as a demo I can delete.
