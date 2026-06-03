# Rosette — Architecture

## Overview

Rosette uses a **shared Rust core** that powers both the Desktop (Tauri) and Mobile (Flutter via FFI) clients. All heavy logic — Git, database, LLM orchestration, linking engine — lives in this core, making it platform-agnostic and testable in isolation.

```
┌─────────────────────────────────────────────────────┐
│                   Rosette Workspace                  │
│                                                     │
│  ┌───────────────────┐   ┌───────────────────────┐  │
│  │  Desktop (Tauri)  │   │   Mobile (Flutter)    │  │
│  │  React + TipTap   │   │   Dart + flutter_rust │  │
│  └────────┬──────────┘   └──────────┬────────────┘  │
│           │                         │               │
│           └──────────┬──────────────┘               │
│                      │                              │
│         ┌────────────▼────────────┐                 │
│         │     Rust Core (FFI)     │                 │
│         │                         │                 │
│         │  ┌─────────────────┐    │                 │
│         │  │  Git Engine     │    │                 │
│         │  │  (git2-rs)      │    │                 │
│         │  ├─────────────────┤    │                 │
│         │  │  SQLite         │    │                 │
│         │  │  (sqlx)         │    │                 │
│         │  ├─────────────────┤    │                 │
│         │  │  Link Graph     │    │                 │
│         │  │  Engine         │    │                 │
│         │  ├─────────────────┤    │                 │
│         │  │  LLM Router     │    │                 │
│         │  │  (local/cloud)  │    │                 │
│         │  └─────────────────┘    │                 │
│         └─────────────────────────┘                 │
│                      │                              │
│         ┌────────────▼────────────┐                 │
│         │    Local Filesystem     │                 │
│         │  /workspace/            │                 │
│         │    /books/              │                 │
│         │      /main-novel/       │                 │
│         │        .git/            │                 │
│         │        chapters/        │                 │
│         │      /encyclopedia/     │                 │
│         │    rosette.db           │                 │
│         └─────────────────────────┘                 │
└─────────────────────────────────────────────────────┘
```

---

## Layer Breakdown

### 1. Frontend Layer

**Desktop:** Tauri (Rust) + React + TipTap
- TipTap handles the rich text editor with JSON document model
- React manages workspace UI, sidebar, panels
- Tauri provides native window, file system access, and IPC to Rust core

**Mobile:** Flutter + `flutter_rust_bridge`
- Flutter handles all UI rendering
- `flutter_rust_bridge` exposes Rust core functions as Dart async APIs
- Same editor logic, adapted to touch UX

### 2. Rust Core

The shared library compiled as:
- A native sidecar for Tauri (`rosette-core`)
- A static/dynamic lib for Flutter FFI

**Modules:**

| Module | Responsibility |
|---|---|
| `git_engine` | Wraps `git2-rs`. Handles snapshots, branches (drafts), diff, revert. Abstracts all Git terminology into writer-friendly concepts |
| `db` | SQLite via `sqlx`. Stores document metadata, links, character index, tags, workspace config |
| `link_graph` | Bidirectional linking engine. Given a document ID, resolves all inbound/outbound links across books |
| `llm_router` | Routes LLM requests to local (Ollama REST API) or cloud (OpenAI/Anthropic/Gemini compatible) based on user config and mode |
| `search` | Full-text search across all documents in a workspace using SQLite FTS5 |
| `sync` | (Future) CRDT-based sync for multi-device support via Yjs-compatible protocol |

### 3. Storage Layer

Each Book maps to a **Git repository** on disk:
```
workspace/
  rosette.db              ← workspace-level metadata & link graph
  books/
    main-novel/
      .git/               ← Git repo for this book
      chapters/
        ch01-the-beginning.md
        ch02-the-call.md
      notes.md
    encyclopedia/
      .git/
      characters/
        aria-voss.md
      locations/
        the-citadel.md
    research/
      .git/
      references.md
```

Documents are stored as **Markdown files** — plain text, portable, human-readable without Rosette.

---

## LLM Architecture

```
User triggers LLM feature
         │
         ▼
   LLM Router (Rust)
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 Local      Cloud
 (Ollama)  (API Key)
    │         │
    └────┬────┘
         │
   Mode Processor
   (novel / worldbuilding / research)
         │
         ▼
   Response streamed to editor
```

**Modes:**
- `novel` — character consistency check, pacing analysis, plot hole detection
- `worldbuilding` — lore consistency, geographic coherence
- `research` — summarization, citation suggestion
- `general` — autocomplete, rephrase, expand

**Model Recommendation Logic:**
- Rosette detects available VRAM/RAM on first launch
- Recommends appropriate model tier (1.5B, 3B, 7B, etc.)
- User can override at any time

---

## Data Flow: Creating a Snapshot

```
User clicks "Save Snapshot" → names it "Draft 3 - Act 1 complete"
         │
         ▼
Frontend sends IPC call to Rust core
         │
         ▼
git_engine stages all changed .md files in the book's Git repo
         │
         ▼
git_engine creates a commit with the snapshot name as message
         │
         ▼
db records snapshot metadata (timestamp, book_id, description)
         │
         ▼
Frontend updates snapshot list in sidebar
```

---

## Inter-Book Linking

Links are stored in `rosette.db`, not in the Git repos. This keeps the Git history clean (only prose changes) while allowing the link graph to evolve independently.

```sql
CREATE TABLE links (
  id TEXT PRIMARY KEY,
  source_book_id TEXT NOT NULL,
  source_doc_path TEXT NOT NULL,
  target_book_id TEXT NOT NULL,
  target_doc_path TEXT NOT NULL,
  link_type TEXT,         -- 'character_ref', 'location_ref', 'lore_ref', 'custom'
  context_snippet TEXT,   -- the sentence around the link for preview
  created_at INTEGER
);
```

When a writer types `[[Aria Voss]]` in a chapter, Rosette:
1. Resolves the reference against all books in the workspace
2. Creates a link record in `rosette.db`
3. Shows a hover preview of the character sheet
