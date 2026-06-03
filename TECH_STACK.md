# Rosette — Tech Stack

## Decision Summary

| Layer | Choice | Rationale |
|---|---|---|
| Desktop shell | **Tauri v2** | Small binary, Rust backend, secure filesystem access, much lighter than Electron |
| Mobile | **Flutter** | Best cross-platform option for shared UI; `flutter_rust_bridge` allows Rust core reuse |
| Desktop UI | **React 18 + TypeScript** | Mature ecosystem for complex editor UIs; TipTap has first-class React support |
| Rich text editor | **TipTap v2** | ProseMirror-based, extensible, JSON document model, active ecosystem |
| Rust core | **Rust (2021 edition)** | Shared logic across Desktop and Mobile via FFI; performance-critical for Git ops |
| Git library | **git2-rs** | Native libgit2 bindings — more robust than isomorphic-git for complex operations |
| Local database | **SQLite via sqlx** | Embedded, zero-config, excellent Rust support, sufficient for metadata + link graph |
| Search | **SQLite FTS5** | Built into SQLite, no extra dependency needed for full-text search |
| LLM (local) | **Ollama REST API** | Simplest local LLM integration — runs as a sidecar, exposes OpenAI-compatible API |
| LLM (cloud) | **OpenAI-compatible endpoint** | Supports OpenAI, Anthropic, Gemini, Groq, and any OpenAI-compatible provider |
| Multi-device sync | **Yjs + CRDTs** (future) | Conflict-free document sync without a central server |

---

## Desktop Stack Detail

### Tauri v2
- Provides native webview for React frontend
- Rust commands exposed via `#[tauri::command]`
- File system, OS notifications, window management handled natively
- CSP enforced — no remote code execution

### React + TypeScript
- Vite as build tool
- Zustand for state management (lightweight, no boilerplate)
- TanStack Query for async data fetching from Rust core

### TipTap v2
Extensions used:
- `@tiptap/extension-document`
- `@tiptap/extension-paragraph`
- `@tiptap/extension-heading`
- `@tiptap/extension-link`
- Custom: `RosetteLink` — for `[[wikilink]]` style references
- Custom: `LLMSuggestion` — inline ghost text autocomplete
- Custom: `CommentMark` — for LLM annotations (consistency warnings, etc.)

---

## Mobile Stack Detail

### Flutter
- Dart for all UI logic
- `flutter_rust_bridge` v2 for calling Rust core functions as async Dart APIs
- `flutter_quill` considered but likely replaced by custom Flutter editor backed by Rust document model

### flutter_rust_bridge
- Auto-generates Dart bindings from Rust function signatures
- Handles async, streams, complex types
- Allows mobile to share 100% of core logic with desktop

---

## Rust Core Crates

```toml
[dependencies]
git2 = "0.18"           # Git operations
sqlx = { version = "0.7", features = ["sqlite", "runtime-tokio"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.11", features = ["json", "stream"] }  # Ollama + cloud API calls
tantivy = "0.21"        # Optional: more powerful full-text search if FTS5 insufficient
uuid = { version = "1", features = ["v4"] }
chrono = "0.4"
```

---

## LLM Integration

### Local (Ollama)
- Rosette starts Ollama as a managed sidecar process on Desktop
- Communicates via `http://localhost:11434` (OpenAI-compatible API)
- Recommended models by device tier:

| VRAM | Recommended Model | Expected Speed |
|---|---|---|
| 4 GB | `qwen2.5:1.5b-instruct-q4_K_M` | ~15 tok/s |
| 6 GB | `qwen2.5:3b-instruct-q4_K_M` | ~12 tok/s |
| 8 GB+ | `qwen2.5:7b-instruct-q4_K_M` | ~8 tok/s |
| CPU only | `qwen2.5:1.5b-instruct-q4_0` | ~3 tok/s |

### Cloud
- User provides their own API key (stored in OS keychain, not plaintext)
- Supports any OpenAI-compatible endpoint
- First-class support: OpenAI, Anthropic, Google Gemini, Groq

---

## File Format

All documents stored as **Markdown** with YAML frontmatter:

```markdown
---
id: "doc_abc123"
title: "Chapter 1 — The Beginning"
type: "chapter"
tags: ["act-1", "aria-voss", "the-citadel"]
created: 2025-01-01
modified: 2025-06-04
---

# Chapter 1 — The Beginning

The morning Aria arrived at [[The Citadel]], she carried nothing but a name.
```

The `[[The Citadel]]` syntax is resolved by the link engine at read time.

---

## Why Not...

| Alternative | Why Rejected |
|---|---|
| Electron | Too heavy (~150MB baseline). Tauri achieves same result at ~10MB |
| Isomorphic-git | JS-only, limited features, slower than native libgit2 |
| PouchDB / CouchDB | Overkill for local-first; SQLite is simpler and sufficient |
| Obsidian plugin | No control over core architecture; can't integrate deep editor features |
| Web app only | Can't run local LLMs; filesystem access is severely limited |
