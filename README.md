# LeviOS Outreach · v0.2 (cloud integration foundation)

A working encrypted, offline-first outreach command-center app. Its original browser-local mode still works independently; the newly committed **opt-in Supabase cloud synchronization and Gmail bridge require a Supabase project, SQL migration, Google OAuth setup, and server credentials before they become operational**.

## Features currently usable without external services

- A modern responsive dashboard with real record-derived metrics (no fabricated demo data)
- Business, career, networking, and collaboration opportunities
- Create, edit, delete, search, and filter records
- Kanban pipeline with distinct outreach stages
- Draft messaging, subject lines, researched angles, optional concept URLs
- **Copy & Open**: copy a draft and open Gmail compose or a verified social profile
- **Explicit sent confirmation**: opening a page/copying text never counts as a send
- Record a reply and automatically cancel the outstanding follow-up
- Reschedule follow-ups five business days at a time
- Chronological activity history and limited actual-outcome analytics
- Browser-local AES-256-GCM encryption using a PBKDF2-SHA256 derived key
- Password is never stored; key remains only in memory; idle auto-lock after 20 minutes
- Encrypted JSON backup/restore; unencrypted CSV export (with warning); CSV/JSON import with validation and duplicate checks

## Cloud + Gmail integration (requires setup)

New code: `cloud.js`, `supabase/migrations/20261115000000_outreach_cloud.sql`, `supabase/functions/gmail-bridge/index.mjs`, and `.github/workflows/check.yml`.

**[Full setup guide](docs/CLOUD_SETUP.md)** covers Supabase user allowlisting, encrypted cloud revisions, conflict recovery, Gmail OAuth and the server-side refresh-token vault.

Features are opt-in and stay disabled until the cloud is configured. Clicking **Cloud & Gmail** opens the setup panel. Cloud data is encrypted browser-side; Gmail authorization is separate. In the Outreach Queue, **Gmail Draft** is available for email prospects only after a valid Gmail connection is enabled. No messages are sent automatically.

### Integration status

- Source code: committed and checked by GitHub Actions
- Database migration: present but **not yet applied to your Supabase project**
- Cloud login and synchronization: **awaiting Supabase account/project authorization**
- Gmail OAuth + draft creation + metadata inspection: **awaiting Google OAuth credentials and Edge Function deployment**
- Cross-device merge: not supported; conflicting revisions stop rather than overwrite

## Run locally

Serve the folder with an HTTP server (necessary for Web Crypto on supported secure origins):

```sh
python -m http.server 8080 --bind 127.0.0.1
```

Then visit http://127.0.0.1:8080 . The application has no compilation step and does not require npm.

## Standalone GitHub Pages deployment

This is the source repository `LeviMunk/levios-outreach`. The app is served from the repository root (`index.html`, `styles.css`, `app.js`, `favicon.svg`). Enable **Settings → Pages → Build and deployment → Deploy from a branch → main / (root)** in GitHub if not yet enabled. A project site normally uses `https://levimunk.github.io/levios-outreach/`, or may inherit the account site's `levimunk.com/levios-outreach/` custom-domain path, depending on Pages configuration. Verify actual published URL in GitHub Pages settings. The existing `LeviMunk/levimunk.github.io/levios-outreach/` copy is deliberately left untouched as a fallback until the new project-site deployment is confirmed.

This repository contains only application source code. Never commit private prospect records, exported CSV/JSON data, API tokens, or Gmail credentials.

**Security limitation:** anyone can download the publicly hosted *application code*, but no private records are part of that code. All entered data is encrypted in browser storage. Because the app is a static public site, this is **not a remote authenticated, cross-device production CRM**; it does not authenticate access to a cloud database. Use a dedicated server-side auth and storage provider before adding cloud synchronization or Gmail credentials.

## Vault and backups

- Use a long, unique passphrase (12 characters minimum). You need it each time you unlock the app.
- Data stays on the browser/device where created. It is **not synchronized** to other devices.
- Download encrypted backups after significant changes. Clearing browser data, changing profiles or losing the device without a backup loses your data.
- An encrypted backup can be imported on another device, then unlocked with the original passphrase. This **replaces**, not merges, the local vault.
- CSV export is intentionally marked as unencrypted. Protect exported CSV files appropriately.
- A strong passphrase mitigates offline guessing; a compromised browser, malicious extension, or injected script could still read decrypted data while the app is unlocked.
- The app imports JSON prospect arrays and simple CSVs. Optional encrypted cloud synchronization and a Gmail bridge have been implemented in source, but are not active until provider setup. A direct ChatGPT AI backend does not exist yet.

## Future milestones after cloud setup

1. Complete Supabase project setup, authorized email sign-in, apply the SQL migration, and verify two-device encrypted sync and conflict handling.
2. Deploy the Gmail Edge Function using Google OAuth credentials; verify draft creation and read-only metadata retrieval.
3. Implement reviewed Gmail thread matching, confirmed-send and reply reconciliation, follow-up suppression, and consented notifications.
4. Implement a schema-validated AI ingestion endpoint, with human approval, idempotency, and source attribution.
5. Add import adapters to `LeviMunk/levios-career`, preserving its source and any real existing data. Its current README specifies no authentication, so do not expose it to the internet.
6. Add automated tests beyond the static smoke checks and support safe deployments.

## Data model (prototype)

Each record has `id`, `name`, `type`, `industry`, `location`, `person`, `channel`, `email`, `profile`, `website`, `stage`, `followup`, `concept`, `angle`, `subject`, `draft`, `notes`, `createdAt`, and `updatedAt`. Activities have `id`, `recordId`, `kind`, `summary`, `snapshot`, and `at`.

The next phase should normalize organizations, contacts, opportunities, messages, conversations, tasks, and provenance into a database instead of treating this browser-local structure as a permanent schema.

## Licensing

This initial code is intended for the repository owner. Keep the new code and any credentials separate; it uses no external source-code libraries or paid APIs.