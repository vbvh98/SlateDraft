# SlateDraft Studio

**100% offline screenwriting and pre-production suite for cinema & OTT — built with Rust (Tauri v2), React 19, and TypeScript.**

## Features

- **Screenplay Editor:** 12pt Courier industry layout, 10 element types (`⌘1`–`⌘8`), 100-step Undo/Redo, Find & Replace (`⌘F`), live page breaks, `(CONT'D)` cues, right-margin revision asterisks (`*`), diagonal PDF watermarks, and Draft Snapshots & Revision Comparison.
- **Native Indic & Hinglish Authoring:** Sub-millisecond Rust phonetic transliteration across Hindi, Marathi, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, and Punjabi, plus empirical regional page-timing calibration.
- **Production & Crew Command Suite:**
  - **1st AD Stripboard** with color-coded strips (`INT/EXT`, `DAY/NIGHT`), drag-and-drop scheduling, and one-click Auto-Schedule by Location.
  - **Producer Day-Out-of-Days (DOOD)** matrix with `SW`/`W`/`H`/`WF`/`SWF` codes and paid Hold-day alerts.
  - **Director & DOP Shot List** with lens, movement, lighting notes, setup times, and on-set completion tracking.
  - **Department Breakdown & HOD Packets** with automatic script cue detection and per-department CSV exports.
  - **Daily Call Sheet Generator** with editable cast call times, Key Crew Contacts, print layout, and WhatsApp/crew-group copy.
- **Industry Interchange & Local Persistence:** Native `.slatedraft` project files with rolling local backups, plus `.fdx` (Final Draft) and `.fountain` round-trip support.
- **Three Studio Themes:** Dark Obsidian (`obsidian`), Archival Paper (`sahitya`), and Midnight Slate (`neel`).

## Development

```bash
npm install
npm run dev          # Vite frontend dev server
npm run tauri:dev    # Full native Tauri desktop app
npm test             # Vitest unit tests
npm run rust:test    # Rust unit tests
npm run build        # Production TypeScript + Vite build
npm run tauri:build  # Native desktop installer build
```

## License

Licensed under the [MIT License](LICENSE). See also [PRIVACY.md](PRIVACY.md) and [TERMS.md](TERMS.md).
