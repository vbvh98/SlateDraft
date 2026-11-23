# SlateDraft Studio — Master Architecture & Implementation Plan

> **The Rust-Powered Screenwriting & Pre-Production Suite for Cinema & OTT.**  
> *Native Indic & Hinglish phonetic authoring, empirical regional page-timing, Final Draft & Scrite pro workflows, reusable Studio UI Component Library, on-device voice & translation, and 100% offline script confidentiality.*

---

## 1. Executive Summary & Architectural Decision

### Why Tauri v2 (Rust Core) + React 19 + TypeScript?
**SlateDraft Studio** is engineered as a **native desktop application built on Rust (Tauri v2)** with a **strictly typed React 19 + TypeScript UI layer**, targeting **macOS (Apple Silicon `aarch64-apple-darwin`)**, **Windows (`x86_64` / `ARM64`)**, and **Linux (`x86_64` / `aarch64`)**.

| Architectural Requirement | Pure Rust GUI (`iced`/`egui`/`slint`) | Electron (Chromium + Node) | **SlateDraft: Tauri v2 (Rust + Native WebView + TS)** |
| :--- | :--- | :--- | :--- |
| **Indic Complex-Script Shaping** (Devanagari conjuncts, Tamil/Telugu/Malayalam *matras*) | Partial / experimental cursor & grapheme cluster support | Good (HarfBuzz), but 250 MB+ binary & high RAM | **Native OS Shaping** (Apple CoreText on macOS, DirectWrite on Windows, HarfBuzz/Pango on Linux) |
| **Memory & Binary Size** | ~15 MB / ~40 MB RAM | ~240 MB / 600 MB+ RAM | **< 10 MB binary / ~60 MB RAM** |
| **Phonetic Transliteration & File Parsing** | Native Rust | Slow JS main-thread | **Native Rust (`< 0.5 ms` IPC commands)** |
| **FDX / Fountain / Breakdown Engine** | Native Rust | JS | **Native Rust zero-copy XML & text parsers** |
| **UI Polish for Creative Professionals** | Rigid widget trees | High (Web CSS) | **Bespoke 60fps Editorial Studio UI + Print-ready CSS `@page`** |
| **On-Device ML (Whisper / IndicTrans2)** | Native Rust (`whisper-rs`, `ort`) | Complex C++ addons | **Native Rust crates (`whisper-rs`, `ort`, `candle`)** |

---

## 2. Reusable Studio UI Component Library (`src/components/ui/`)

All workspaces share a single unified, strictly typed UI Component Library (`src/components/ui/`) with zero duplicate primitive markup:
- **`Button` & `IconButton`** ([`src/components/ui/Button/Button.tsx`](file:///Users/vbhv/Desktop/projects/Screenwritter/src/components/ui/Button/Button.tsx)): Variants (`primary`, `secondary`, `ghost`, `amber-soft`, `danger`, `outline`), sizes (`xs`, `sm`, `md`), icon slots, and active states.
- **`Badge`** ([`src/components/ui/Badge/Badge.tsx`](file:///Users/vbhv/Desktop/projects/Screenwritter/src/components/ui/Badge/Badge.tsx)): Semantic studio pills (`amber`, `stone`, `emerald`, `rose`, `sky`, `purple`, `red`, `orange`, `outline`) with removable tag support.
- **`Card` & `StatCard`** ([`src/components/ui/Card/Card.tsx`](file:///Users/vbhv/Desktop/projects/Screenwritter/src/components/ui/Card/Card.tsx)): Studio container cards and metric tiles.
- **`Input` & `Textarea`** ([`src/components/ui/Input/Input.tsx`](file:///Users/vbhv/Desktop/projects/Screenwritter/src/components/ui/Input/Input.tsx)): Labeled text inputs and screenplay textareas.
- **`Select<T>`** ([`src/components/ui/Select/Select.tsx`](file:///Users/vbhv/Desktop/projects/Screenwritter/src/components/ui/Select/Select.tsx)): Generic strongly-typed dropdown selector.
- **`Slider`** ([`src/components/ui/Slider/Slider.tsx`](file:///Users/vbhv/Desktop/projects/Screenwritter/src/components/ui/Slider/Slider.tsx) & [`Slider.test.tsx`](file:///Users/vbhv/Desktop/projects/Screenwritter/src/components/ui/Slider/Slider.test.tsx)): Dedicated folder structure and unit test suite for range sliders (used in Table-Read narration speed/pitch, character voice tuning, and AV shot durations).
- **`Modal`** ([`src/components/ui/Modal/Modal.tsx`](file:///Users/vbhv/Desktop/projects/Screenwritter/src/components/ui/Modal/Modal.tsx)): Studio dialog container.
- **`Tabs<T>`** ([`src/components/ui/Tabs/Tabs.tsx`](file:///Users/vbhv/Desktop/projects/Screenwritter/src/components/ui/Tabs/Tabs.tsx)): Segmented navigation bar.
- **`WorkspaceHeader`** ([`src/components/ui/WorkspaceHeader/WorkspaceHeader.tsx`](file:///Users/vbhv/Desktop/projects/Screenwritter/src/components/ui/WorkspaceHeader/WorkspaceHeader.tsx)): Standardized workspace header with title, subtitle, icon, and action slot.

---

## 3. Built-in Industry Starter Templates (`src/data/templates.ts`)

SlateDraft launches into a **clean, distraction-free `UNTITLED SCREENPLAY` canvas** (zero pre-written demo story) and includes 8 structural starter templates:
1. **Blank Feature Screenplay** (Standard 12pt Courier layout)
2. **Theatrical Feature (Interval Structure)** (Act I, Pre-Interval Block, `INTERVAL`, Post-Interval Act II, Climax)
3. **OTT Prestige Drama (1-Hour Episode)** (Teaser/Cold Open + 4 Acts + Episode Hook Tag)
4. **Episodic Half-Hour (30-Min Series / Dramedy)** (Cold Open + 3 Acts + Tag)
5. **Classic 3-Act Feature (WGA / International Standard)** (US Letter 12pt Courier Blueprint)
6. **2-Column TVC / Brand Commercial (60s AV Split)** (Synchronized Visual & Audio columns with timecode cues)
7. **Film Song & Musical Sequence Breakdown** (Mukhda / Pallavi, Interlude Montage, Antara / Charanam, Choreography cues)
8. **Short Film / Festival Script (15-Min Format)** (Compact 3-Movement Short Blueprint)

---

## 4. Studio Design Principles

SlateDraft Studio is designed around **calm editorial precision** so the screenplay canvas remains the focal point across long writing sessions:

- **Semantic Theme Tokens (`obsidian`, `sahitya`, `neel`)**: All chrome, modals, inputs, tables, and status surfaces consume CSS custom properties (`--bg-app`, `--bg-surface`, `--bg-surface-2`, `--bg-elevated`, `--bg-input`, `--border-subtle`, `--border-strong`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--accent-soft`) bound to `[data-theme]` on both `<html>` and the root container. This guarantees legible ink contrast across Dark Obsidian, Archival Paper (`sahitya`), and Midnight Slate (`neel`) without hardcoded dark surfaces.
- **Typographic Hierarchy**: 12pt Courier (`Courier Prime` / monospace) is reserved exclusively for screenplay pages, scene numbers, and timing metrics, paired with a clean sans-serif UI chrome so structural controls never compete visually with the script.
- **Calm Editorial Chrome**: Contextual quick-token strips only appear when the active element has relevant tokens (`scene-heading`, `character`, `transition`), keeping Action and Dialogue views taller and distraction-free. Print layouts override viewport height/overflow constraints (`print-root`) so multi-page PDF exports never clip.
- **Accessibility & Keyboard-First Choreography**:
  - Consistent `focus-visible` amber rings, semantic `role="dialog"` / `role="menu"` ARIA attributes, `React.useId()` label bindings, and keyboard-reachable row/block actions (`group-focus-within`).
  - Full desktop shortcut matrix: `⌘Z` / `⇧⌘Z` (Undo/Redo, scoped away from regular inputs/modals via `data-script-block`), `⌘1`–`⌘8` (instant element switching), `⇧⌘V` (Smart Paste Intake), `⌘B` (Sidebar), `⌘\` / `Esc` (Zen Mode), `ArrowUp`/`ArrowDown` across block boundaries, and smart `Enter` on empty dialogue/character blocks.

---

## 5. Core State & Usability Architecture

- **Ref-Backed Undo/Redo Stack (`src/App.tsx`)**: Maintains up to 100 history snapshots without stale-closure drift. Structural mutations (insert, delete, element change, omit, dual dialogue, scene move, smart paste, file import, template load) commit immediately, while continuous text edits debounce (`400ms`) so typing a sentence forms a single undo step and fast `⌘Z` cleanly steps back while preserving the in-progress text for redo.
- **Chunk-Safe Scene Reordering (`moveSceneChunk` in `src/services/formatInterchange.ts`)**: Extracts the entire scene chunk—from `scene-heading` through all body blocks up to the next `scene-heading` or `section-act`—and relocates it before the previous or after the next scene chunk, preserving Act/Interval markers and recalculating scene numbers (including locked A-pages).
- **Final Draft `.fdx` Round-Trip (`exportToFdx` / `parseFdxXml` / `extractFdxTitlePage`)**: Pure TypeScript XML serializer and parser with zero `DOMParser` dependency (running identically in Tauri WebView, browsers, and Node/Vitest), preserving `<TitlePage>` metadata, `<Paragraph Type="...">`, scene numbers, dual dialogue, and revision IDs.
- **Local Autosave & Safe Hydration (`slatedraft-workspace-v1`)**: Debounced (`600ms`) persistence to `localStorage` for title page, blocks, AV rows, character profiles, language, revision color, scene locks, theme, and active template, paired with validated startup hydration, destructive-action confirmations (New Script / Template Load), and a live footer save indicator.
