# LeviOS Outreach · v0.3 (Strategy Lab + Gmail reply review)

A working encrypted, offline-first outreach command-center app. Its original browser-local mode still works independently; the opt-in Supabase cloud synchronization and Gmail bridge are configured for the owner. A separate Google OAuth authorization is still required on each new authorization cycle.

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

## Strategy Lab

The **Strategy Lab** stores eight editable outreach hypotheses and allows new custom experiments. Assign an experiment and A/B variant on each opportunity before sending. Human replies, positive replies, meeting stages, and industry performance are calculated from confirmed sends and reviewed outcomes, not open pixels. The assignment, sent subject, word count and CC count are snapshotted at the time of manual send confirmation so later edits do not rewrite history.

**Insights → Scan Gmail for replies** reviews only messages sharing a Gmail thread with actual sent email to the target prospect and checks chronology. It fetches metadata, never message bodies, and presents candidates for human classification. Your decision determines positive, neutral, negative, opt-out, or automated status; no campaign messages are ever sent by the bridge. Email drafts may include up to 3 verified, transparent CC stakeholders.

See [Strategy Lab playbook](docs/STRATEGY_LAB.md) for experiment design, measurement definitions, deliverability and truthful identity requirements.

## Cloud + Gmail integration

New code: `cloud.js`, `supabase/migrations/20261115000000_outreach_cloud.sql`, `supabase/functions/gmail-bridge/index.mjs`, and `.github/workflows/check.yml`.

**[Full setup guide](docs/CLOUD_SETUP.md)** covers Supabase user allowlisting, encrypted cloud revisions, conflict recovery, Gmail OAuth and the server-side refresh-token vault.

Features are opt-in and stay disabled until the cloud is configured. Clicking **Cloud & Gmail** opens the setup panel. Cloud data is encrypted browser-side; Gmail authorization is separate. In the Outreach Queue, **Gmail Draft** is available for email prospects only after a valid Gmail connection is enabled. No messages are sent automatically.

### Integration status

- Source code: committed and checked by GitHub Actions
- Supabase project: **created** (`yfqtyuynsumvwhnmnswk`, initial project cost quoted $0/month)
- Database migration: **applied**; RLS verified on all three tables
- Public Supabase project URL and publishable key: **preconfigured** in `cloud.js`
- Cloud login: **verified**; encrypted vault revision uploaded and read back
- Gmail Edge Function: **deployed**; Gmail OAuth and one self-addressed draft verified, draft record confirmed in database
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

**Security limitation:** anyone can download the publicly hosted *application code*, but no private records are part of that code. All entered data is encrypted in browser storage. The public static site contains no privileged secrets. Owner-only authenticated Supabase synchronization stores encrypted payloads; Gmail refresh tokens are sealed by a server-side secret. This remains a single-user prototype, not a production multi-tenant CRM.

## Vault and backups

- Use a long, unique passphrase (12 characters minimum). You need it each time you unlock the app.
- Data remains encrypted locally. When opted in, ciphertext snapshots synchronize through authenticated Supabase with revision-conflict protection. Multi-device merge is not implemented.
- Download encrypted backups after significant changes. Clearing browser data, changing profiles or losing the device without a backup loses your data.
- An encrypted backup can be imported on another device, then unlocked with the original passphrase. This **replaces**, not merges, the local vault.
- CSV export is intentionally marked as unencrypted. Protect exported CSV files appropriately.
- A strong passphrase mitigates offline guessing; a compromised browser, malicious extension, or injected script could still read decrypted data while the app is unlocked.
- The app imports JSON prospect arrays and simple CSVs. Optional encrypted cloud synchronization and Gmail drafting are operational for the owner, with manual authorization and no sending capability. A direct ChatGPT AI backend does not exist yet.

## Next improvements

1. Verify a real sent-and-replied conversation in the read-only Gmail reply-review flow (metadata and matching sent-thread required; never auto-record human sentiment).
2. Verify two-device encrypted sync and conflict handling, and improve merge UX.
3. Expand bounce and suppression analytics, with optional consented reporting and notifications.
4. Implement a schema-validated AI ingestion endpoint, with human approval, idempotency, and source attribution.
5. Add import adapters to `LeviMunk/levios-career`, preserving its source and any real existing data. Its current README specifies no authentication, so do not expose it to the internet.
6. Add automated tests beyond the static smoke checks and support safe deployments.

## Data model (prototype)

Each record has `id`, `name`, `type`, `industry`, `location`, `person`, `channel`, `email`, `profile`, `website`, `stage`, `followup`, `concept`, `angle`, `subject`, `draft`, `notes`, `cc`, `strategyId`, `variant`, `createdAt`, and `updatedAt`. Activities have `id`, `recordId`, `kind`, `summary`, `snapshot`, `meta`, and `at`. Strategy library objects live in the same encrypted vault.

The next phase should normalize organizations, contacts, opportunities, messages, conversations, tasks, and provenance into a database instead of treating this browser-local structure as a permanent schema.

## Licensing

This initial code is intended for the repository owner. Keep the new code and any credentials separate; it uses no external source-code libraries or paid APIs.