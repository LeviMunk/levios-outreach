
## Work packages and conversion funnels
Employment records now optionally store `resumeUrl`, `coverLetterUrl`, `applicationFriction`, `contactVerified`, and `packageNotes`. Business/IndustryOS records may store `offerModule`, `painEvidenceUrl`, and `painHypothesis`. The Employment and Business workspaces show package readiness and linked documents or supporting research, not generated artifacts. Missing links remain missing until materials are prepared. Business pain points are explicitly hypotheses, not factual claims.
Insights now shows distinct employment and business metrics, including human/positive business replies and wins; small cohorts should not be treated as predictive evidence. The application views do not yet generate tailored resumes or letters autonomously, nor do they have continuous live job discovery.

## Assembly-line approval workflow (November 17, 2026)

The **Intake & Approvals** tab provides explicit gates across Employment, Business Development, and Networking:

1. Research/import creates **pending** records. Existing legacy records without an approval flag are also presented for review; no prior sent history is erased.
2. Review each job's listing URL, a professional network profile, or a business source URL with a documented verification label. Then explicitly approve or decline the opportunity. No external evidence is automatically assumed true.
3. Write a tailored message and **approve the exact text, subject, recipient, channel and CC**. Modifying these fields invalidates the prior approval. Changing source or recipient details also returns the opportunity to verification.
4. Only the approved message can be sent to Gmail Drafts or opened/copied for social outreach. Creating a draft does not mark a send.
5. Marking a job application requires a reviewed job plus explicit submission confirmation; follow-ups are scheduled afterward.
6. All approvals, sends and application confirmations are recorded as local encrypted-vault activities.

**Scope:** This release implements the review/approval engine and manual execution controls. It does **not** yet provide a live automatic job-search feed, automatic email sends, automatic job applications or migration from the local LeviOS Career SQLite database. Existing scheduled business research intake remains a separate configured flow and is still imported only when the unlocked app accepts it. Always verify employment eligibility and source authenticity before approving.

# JobOS · Unified Opportunity Command Center

JobOS is the next iteration of LeviOS Outreach, using the existing encrypted vault, Gmail bridge, Supabase configuration, and outreach records. The source repository deliberately retains its existing name so deployed URLs, integrations and browser storage are not disrupted.

## JobOS workspaces (initial UI deployed to source)
- **Dashboard:** cross-workspace totals, confirmed application stages, confirmed sends, follow-ups due and recent activity.
- **Employment:** career records with job title, posting URL, compensation and application date, plus a career-stage Kanban.
- **Business Development:** prospecting, consulting opportunities, business pipeline.
- **Networking:** professional relationships and a distinct networking pipeline.
- **Shared tools:** Messages, all records, aggregate pipelines, follow-ups, insights and Strategy Lab.

**Current limitations:** No live job-search connector in the application yet; the separate LeviOS Career SQLite database has not been migrated; new career records must be entered or imported through existing approved workflows. Current status counts are based on saved records, not externally verified application submissions. Existing Gmail draft and reply review features remain assisted, not automatic sends. The app remains a single-user prototype. Test with a backup of your encrypted vault before modifying important records.

## Recommended migration path
1. Verify current deployed Pages URL and smoke-test unlock, records, browser backup, Gmail drafting and mobile navigation.
2. Export/backup the separate LeviOS Career SQLite database; create an explicit, validated, idempotent import adapter for JobOS career records.
3. Add provenance-backed job discovery inbox with deduplication by posting URL + organization + role, expiration, region eligibility and user review.
4. Normalize organizations, contacts, opportunity types, application events and activities, while protecting private data; keep cloud-authorized ingestion separate from the encrypted vault.
5. Introduce follow-up rules and recruiter-thread association with human approval and suppression controls.

---

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

## Research packs and bulk lead intake

LeviOS can import one JSON research pack with both `records` and `strategies`, or a simpler CSV or JSON prospect list. An intake pack is a plain-text file, **not** an encrypted cloud vault. Do not include credentials, private communications or non-public personal data.

1. Research independently verifiable, appropriately sourced business prospects. Use directories for discovery and official websites for contact detail verification and commercial relevance. Do not bulk-copy Google Maps Places content; its reuse restrictions apply.
2. For each prospect, include `name`, `type`, `industry`, `location`, `website`, `email` only if verified, `sourceUrl`, `researchDate`, `verification` (`official-site`, `directory`, or `unverified`), `angle` and `notes`. Leave unverified email blank; do not fabricate identified decision makers or claim unverified technical problems.
3. For strategy additions, include `id`, `name`, `question`, `a`, `b`, `status`, `notes`. Existing strategy IDs/names are skipped rather than overwritten.
4. Unlock LeviOS → **People & Companies → Import JSON / CSV** → select your research pack. Read the counts and approve. Duplicate prospects and duplicate strategies are skipped.
5. Review imported prospects, select an experiment A or B, draft and manually send only after a factual/compliance check. Drafts and imports never send messages.

Example structure:

```json
{
  "records":[{"name":"Example Bakery","type":"Business","industry":"Bakeries","location":"Appleton, WI","website":"https://example.org","email":"","stage":"Researched","sourceUrl":"https://example.org","researchDate":"2026-11-15","verification":"unverified","angle":"Potential seasonal order follow-up workflow; hypothesis only","notes":"Sample data; validate before contacting."}],
  "strategies":[{"id":"bakery-repeat-2026","name":"Bakery seasonal return visits","question":"Do rebooking prompts outperform general email campaigns?","a":"Seasonal preorder follow-up","b":"General new product invitation","status":"planned","notes":"Test within same industry and comparable offer."}]
}
```

The research pack can be provided by ChatGPT as a downloadable JSON artifact, with source citations. **Encrypted-vault access stays in your browser.** No external assistant can directly mutate an unopened vault from GitHub. An explicit import is the secure handoff.

## Automatic Research Inbox (no JSON downloads)

Verified public business research can be staged server-side in the owner-only `public.outreach_research_batches` Supabase table. The table enforces row-level security; unauthenticated users cannot query it or insert leads. Only the owner can read queued batches. A signed-in, unlocked and revision-linked browser client merges them directly into its encrypted vault and then saves an encrypted Supabase vault revision. **Only after that save succeeds** does the browser acknowledge the research batch as imported. Existing prospect and strategy duplicates are skipped, and existing local records are not overwritten. No messages or Gmail drafts are created.

The initial queue contains **eight non-bakery Madison/Milwaukee-area service-business prospects and two industry-specific experimental strategies**, verified from first-party business pages on November 15, 2026. The queue stays pending until the owner unlocks the connected LeviOS vault in the updated app. A cloud-revision conflict stops the import and retains the queued batch for recovery, rather than overwriting existing data.

To inspect status: open **Cloud & Gmail**, then look for **Research Inbox**. If the app reports that encrypted cloud sync is not active on the device, reconnect the existing vault instead of resetting it. Never send outreach automatically or make unsupported claims about the business.

Future researched batches can be directly staged through authorized Supabase tools in the same JSON schema as the existing research-pack importer. A separate weekly research trigger may be arranged, but is not automatically enabled just by creating the queue.


## Scheduled prospect discovery (GitHub Actions)

A weekly GitHub Actions workflow now discovers low-volume, directory-sourced Madison/Milwaukee service-business candidates, validates provenance, deduplicates existing Research Inbox batches, and stages up to 12 research-only records. It never sends messages. **The intake uses GitHub OIDC; no GitHub secret configuration is needed. The endpoint is deployed, but a live scheduled run still needs verification.** See [Automated Research setup](docs/AUTOMATED_RESEARCH.md). Directory candidates still require review of the business and opportunity before contact.

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
### Employment inbox workflow (first functional pass)

- **Employment** now displays a job intake list with company, job title, salary, location, posting link and status, plus its existing stage pipeline.
- **Import jobs (CSV / JSON)** accepts the existing JobOS record format with `type: "Career"`, `name` (company), `jobTitle`, `jobUrl`, `salary`, `location`, `stage` and optional `appliedDate`. Imports show a review confirmation, skip duplicate applications of the same job and never send messages.
- **Mark applied** requires manual confirmation of submission, timestamps the record and adds a six-business-day suggested follow-up. Merely opening a job posting does not count as applying.
- The Career import deduplication key distinguishes jobs at the same company by posting URL or role; non-career prospect records retain category-specific contact/domain duplicate checks.
- No actual live job provider integration, Career SQLite migration, or automated submission has occurred; imported records remain owner-reviewed and stored in the existing encrypted vault.

Example import file:

```json
{
  "records": [
    {
      "type": "Career",
      "name": "Example Company",
      "jobTitle": "Business Analyst",
      "jobUrl": "https://example.com/careers/business-analyst",
      "salary": "$75,000–$90,000",
      "location": "Remote (US)",
      "stage": "Discovered",
      "sourceUrl": "https://example.com/careers/business-analyst",
      "researchDate": "2026-11-17"
    }
  ]
}
```

