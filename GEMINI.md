# GEMINI.md — Rosette Project Context

This file is a context document for AI assistants (Gemini, Claude, GPT, etc.) working on the Rosette codebase. Read this before making any suggestions or generating any code.

---

## What is Rosette?

Rosette is a **cross-platform writing workspace** for long-form writers (novelists, worldbuilders, screenwriters). It is NOT a general note-taking app, NOT a coding tool, and NOT a cloud-first SaaS product.

Key differentiators:
1. **Git-based version control** abstracted into writer-friendly concepts (Snapshots, Drafts)
2. **Book-based workspace** — multiple linked "repositories" (Books) in one workspace
3. **Bidirectional linking** across Books (like Obsidian, but structured around fiction writing)
4. **LLM assistant** with writing-specific modes (novel, worldbuilding, research)
5. **Local-first** — all data lives on the user's machine

---

## Architecture (Critical — Read Before Suggesting Code)

```
Frontend (Desktop)     Frontend (Mobile)
React + TipTap         Flutter + Dart
Tauri v2               flutter_rust_bridge
      │                       │
      └──────────┬────────────┘
                 │
         Rust Core Library
         ┌───────────────┐
         │ git2-rs       │  Git operations
         │ sqlx/SQLite   │  Metadata & links
         │ reqwest       │  LLM API calls
         └───────────────┘
                 │
         Local Filesystem
         Markdown files + .git repos
```

**Never suggest:**
- Isomorphic-git (we use git2-rs — native libgit2, more robust)
- Electron (we use Tauri — smaller, faster, more secure)
- MongoDB/PostgreSQL (we use SQLite — local-first, embedded)
- Any cloud database as primary storage
- Storing documents in a database (documents are Markdown files on disk, Git-tracked)

---

## File & Folder Conventions

```
workspace/
  rosette.db            ← SQLite: metadata, links, workspace config
  books/
    <book-slug>/
      .git/             ← Each book is its own Git repository
      <doc-slug>.md     ← Documents are plain Markdown files
      <subfolder>/
        <doc-slug>.md
```

### Document Format

All documents use Markdown with YAML frontmatter:

```markdown
---
id: "doc_<uuid>"
title: "Document Title"
type: "chapter" | "character" | "location" | "lore" | "note" | "custom"
tags: ["tag1", "tag2"]
created: "YYYY-MM-DD"
modified: "YYYY-MM-DD"
---

Document content here. [[Wikilinks]] are supported.
```

---

## Naming Conventions (Writer-Facing vs Internal)

Always use writer-facing language in UI and user-visible strings:

| Git Concept | Rosette UI Term |
|---|---|
| Repository | Book |
| Commit | Snapshot |
| Branch | Draft |
| Merge | Combine Drafts |
| Diff | Compare Versions |
| Checkout | Restore |
| Stash | (not exposed) |

Never expose raw Git terminology to the user.

---

## LLM Integration

### Config Shape (stored in `rosette.db`, table `llm_config`)

```json
{
  "mode": "local" | "cloud" | "hybrid",
  "local": {
    "provider": "ollama",
    "base_url": "http://localhost:11434",
    "model": "qwen2.5:1.5b-instruct-q4_K_M"
  },
  "cloud": {
    "provider": "openai" | "anthropic" | "gemini" | "groq" | "custom",
    "base_url": "https://api.openai.com/v1",
    "api_key_ref": "keychain:rosette_cloud_api_key",
    "model": "gpt-4o-mini"
  },
  "writing_mode": "novel" | "worldbuilding" | "research" | "general"
}
```

**API keys are NEVER stored in plaintext.** They are stored in the OS keychain and referenced by a key name.

### Routing Logic (hybrid mode)

- Real-time features (autocomplete, ghost text) → local model
- Deep analysis (consistency check, pacing) → cloud model
- User can override per-request

---

## SQLite Schema (Current)

```sql
-- Workspace metadata
CREATE TABLE workspace (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER,
  version INTEGER DEFAULT 1
);

-- Books
CREATE TABLE books (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'main',  -- 'main', 'encyclopedia', 'research', 'data', 'custom'
  git_path TEXT NOT NULL,
  created_at INTEGER
);

-- Document metadata (mirrors frontmatter, kept in sync)
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  book_id TEXT REFERENCES books(id),
  file_path TEXT NOT NULL,
  title TEXT,
  doc_type TEXT,
  tags TEXT,  -- JSON array
  created_at INTEGER,
  modified_at INTEGER
);

-- Bidirectional links
CREATE TABLE links (
  id TEXT PRIMARY KEY,
  source_book_id TEXT NOT NULL,
  source_doc_id TEXT NOT NULL,
  target_book_id TEXT NOT NULL,
  target_doc_id TEXT NOT NULL,
  link_type TEXT,
  context_snippet TEXT,
  created_at INTEGER
);

-- Snapshots (mirrors Git commits, for metadata only)
CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  book_id TEXT REFERENCES books(id),
  git_commit_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER
);

-- Full-text search
CREATE VIRTUAL TABLE documents_fts USING fts5(
  title, content, tags,
  content=documents,
  content_rowid=rowid
);
```

---

## Rust Core Module Structure

```
rosette-core/
  src/
    lib.rs
    git/
      mod.rs          -- Git operations (snapshot, draft, restore, diff)
      types.rs        -- Snapshot, Draft, DiffResult structs
    db/
      mod.rs          -- SQLite connection pool and migrations
      workspace.rs    -- Workspace CRUD
      books.rs        -- Book CRUD
      documents.rs    -- Document metadata CRUD
      links.rs        -- Link graph CRUD
      snapshots.rs    -- Snapshot metadata CRUD
    llm/
      mod.rs          -- LLM router
      ollama.rs       -- Ollama REST client
      cloud.rs        -- OpenAI-compatible cloud client
      modes/
        novel.rs      -- Novel mode prompts and logic
        worldbuilding.rs
        research.rs
        general.rs
    search/
      mod.rs          -- FTS5 search wrapper
    link_graph/
      mod.rs          -- Link resolution and graph traversal
    error.rs          -- Unified error types
```

---

## Current Status

- **Phase:** Pre-development (architecture & planning)
- **No code exists yet**
- Active decisions still being made on: Flutter vs React Native for mobile, whether to use `tantivy` vs SQLite FTS5 for search

---

## What to Help With

Good tasks for AI assistants on this project:
- Implement specific Rust functions in the module structure above
- Write TipTap custom extensions (TypeScript)
- Write Flutter widgets for the mobile UI
- Write Tauri commands (`#[tauri::command]`)
- Write SQL migrations
- Draft LLM system prompts for specific writing modes
- Review architecture decisions and suggest alternatives with tradeoffs

Bad tasks (do not do these):
- Suggest switching to a web-only architecture
- Add user authentication (Rosette is local-first, no accounts)
- Suggest cloud storage as primary data layer
- Expose raw Git UI to users
