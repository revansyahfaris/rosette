# Rosette

> A writer's workspace with the power of version control, the depth of a knowledge base, and the intelligence of an LLM assistant — built for storytellers.

---

## What is Rosette?

Rosette is a cross-platform writing workspace designed for long-form writers — novelists, worldbuilders, screenwriters, and creative researchers. It combines:

- **Book-based workspace** — organize your writing into Books (like repositories), each with nested child documents (chapters, character sheets, encyclopedias, maps, etc.)
- **Version control** — snapshot your work at any point, compare drafts, and revert — no raw Git UI, just writer-friendly language
- **Linked knowledge base** — connect characters, locations, lore entries, and timelines across books within a single workspace
- **LLM writing assistant** — on-device (Ollama) or cloud (user's own API key), with mode-specific assistance: novel mode, worldbuilding mode, research mode, etc.

---

## Core Concepts

| Concept | Description |
|---|---|
| **Workspace** | The root container. One workspace per project universe (e.g., a novel series) |
| **Book** | A repository-like unit inside a workspace. Can be a main novel, a lore encyclopedia, a character database, etc. |
| **Document** | A child of a Book. Can be a chapter, a character sheet, a location entry, etc. |
| **Snapshot** | A named save state (version). Writer-facing abstraction over Git commits |
| **Branch** | Called a "Draft" in Rosette UI — for writing alternate story paths |
| **Link** | A bidirectional reference between any two documents, across books |

---

## Platform

Rosette targets **Desktop** (via Tauri) and **Mobile** (via Flutter) from day one, sharing a common Rust-based core for Git operations, database, and LLM orchestration.

---

## Status

🚧 **Pre-development — architecture & planning phase**

See [`ROADMAP.md`](./ROADMAP.md) for planned milestones.
