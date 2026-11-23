# Privacy Policy — SlateDraft Studio

**Effective Date:** 2026-01-01  
**Version:** 1.0.0

SlateDraft Studio is built on a **100% local-first data posture**. Your screenplays, treatments, notes, production breakdowns, and project files belong exclusively to you and remain on your device.

## 1. Zero Data Collection & Zero Telemetry

- SlateDraft Studio does **not** collect, transmit, or sell personal information, usage analytics, crash telemetry, or screenplay content.
- There are **no** user accounts, cloud sync servers, tracking pixels, or third-party advertising SDKs bundled in the application.

## 2. Local Processing Only

All core features execute entirely offline on your machine:

- **Screenplay Editing & Storage:** `.slatedraft`, `.fdx`, and `.fountain` files are read from and saved directly to your local filesystem.
- **Rolling Backups & Recent Projects:** Local recovery snapshots (`slatedraft-backups`) and recent project paths (`slatedraft-recent.json`) are stored strictly in your operating system's local storage/temporary directory and are never uploaded.
- **Indic Transliteration & Script Analytics:** Phonetic transliteration, revision locking, and empirical page-timing calculations run locally in the embedded Rust engine with zero network calls.

## 3. Content Security Policy (CSP)

The desktop application enforces a strict Content Security Policy (`default-src 'self'`) that blocks external scripts, remote trackers, and unauthorized network requests from the application window.

## 4. Your Control Over Local Data

Because SlateDraft Studio stores no data on external servers, you have complete control over your files at all times. You may move, back up, encrypt, or delete your `.slatedraft` projects and local backup snapshots directly using your operating system's file manager.

## 5. Policy Updates

Any future changes to this privacy policy will be published in this repository alongside the corresponding software release.
