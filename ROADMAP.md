# Rosette — Roadmap

## Philosophy

Build depth before breadth. Each milestone should produce a usable tool, not just a foundation that requires the next milestone to be valuable.

---

## Milestone 0 — Proof of Concept
**Goal:** Validate that TipTap + Tauri + git2-rs can work together cleanly.

- [ ] Tauri app with basic React shell
- [ ] TipTap editor rendering and saving Markdown files to disk
- [ ] Single Book, single Document — no workspace concept yet
- [ ] Manual Git snapshot via button (commit under the hood)
- [ ] View list of snapshots, restore a snapshot

**Definition of done:** A writer can open a `.md` file, write, save a named snapshot, and restore it.

---

## Milestone 1 — Workspace & Books
**Goal:** Introduce the full workspace/book/document hierarchy.

- [ ] Workspace creation and config (`rosette.db`)
- [ ] Multiple Books per workspace (each = a Git repo on disk)
- [ ] Nested documents within a Book (chapters, notes, etc.)
- [ ] Sidebar tree navigation
- [ ] Document metadata (frontmatter: title, type, tags)
- [ ] Basic search across a single Book (SQLite FTS5)

---

## Milestone 2 — Linking Engine
**Goal:** Connect documents across Books.

- [ ] `[[wikilink]]` syntax in TipTap (custom extension)
- [ ] Link resolution engine (Rust) — searches all books in workspace
- [ ] Hover preview on `[[links]]`
- [ ] Backlinks panel — "this character is referenced in 12 chapters"
- [ ] Cross-workspace search (FTS5 across all books)
- [ ] Link graph visualization (simple node graph view)

---

## Milestone 3 — LLM Integration (Basic)
**Goal:** LLM as a general writing assistant.

- [ ] LLM settings panel — local (Ollama) or cloud (API key)
- [ ] Device spec detection → model recommendation
- [ ] Ollama sidecar management (auto-start/stop)
- [ ] Ghost text autocomplete (inline suggestion, Tab to accept)
- [ ] Selection-based commands: rephrase, expand, summarize, translate
- [ ] General chat panel (context-aware of current document)

---

## Milestone 4 — Novel Mode
**Goal:** Deep writing intelligence for fiction.

- [ ] Character consistency checker
  - Tracks character traits, speech patterns, behavior from character sheets
  - Flags inconsistencies inline in chapters
- [ ] Pacing analyzer — flags passages that are too dense or too sparse
- [ ] Plot thread tracker — LLM maps unresolved threads
- [ ] Timeline assistant — detects temporal inconsistencies
- [ ] "Story so far" — auto-generates rolling summary for each chapter

---

## Milestone 5 — Drafts & Advanced Versioning
**Goal:** Full writing version control, writer-friendly.

- [ ] Drafts (Git branches) — "Draft A: Aria lives", "Draft B: Aria dies"
- [ ] Side-by-side diff view (prose-aware, not line-diff)
- [ ] Draft merge (with conflict resolution UI for writers)
- [ ] Snapshot timeline view (visual history per document)

---

## Milestone 6 — Mobile (Flutter)
**Goal:** Rosette on iOS and Android.

- [ ] Flutter app shell
- [ ] `flutter_rust_bridge` integration with Rosette Rust core
- [ ] Read/write documents, view books
- [ ] Snapshot creation on mobile
- [ ] LLM via cloud only on mobile (local LLM deferred)
- [ ] Sync between desktop and mobile (file-based, via iCloud/Google Drive mount)

---

## Milestone 7 — Sync & Collaboration (Future)
**Goal:** Multi-device and optional collaboration.

- [ ] CRDT-based document sync (Yjs)
- [ ] P2P sync option (no central server required)
- [ ] Optional self-hosted sync server
- [ ] Shared workspace (read-only guest access)

---

## Out of Scope (for now)

- Publishing pipeline (export to EPUB, PDF) — likely a plugin
- Built-in cloud storage — use OS-level sync (iCloud, Dropbox, etc.)
- Real-time collaboration (Google Docs-style) — too complex for current scope
- Windows Store / App Store distribution — post-MVP
