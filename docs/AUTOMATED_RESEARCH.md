# Scheduled LeviOS Outreach Research

GitHub Actions workflow: [Weekly Prospect Research](../.github/workflows/weekly-research.yml).
This runs on Mondays at **14:17 UTC**, which is **8:17 AM CST / 9:17 AM CDT**. GitHub may delay scheduled jobs. The workflow can also run manually from **Actions → LeviOS Outreach weekly prospect research → Run workflow**.

## What it does

1. Queries bounded Madison and Milwaukee OpenStreetMap directory tags for businesses with listed websites.
2. Excludes bakeries and several unsuitable categories. Does not scrape email addresses, use Google Maps data, impersonate a contact, or generate any messages.
3. Writes a JSON research pack containing the business website, OSM evidence link, location, industry, and an explicitly hypothetical service opportunity. All entries are **directory-level leads**, not independently verified businesses or tested problems.
4. Validates shape and provenance; reads existing staged research batches from the owner-only database and skips duplicates.
5. Stages up to 12 new records in `public.outreach_research_batches`. Records are not imported into the encrypted vault until the legitimate owner opens the synced and unlocked app. The browser imports each batch and encrypts it before acknowledging completion.
6. Saves a temporary GitHub Actions artifact for inspection (14-day retention). No email is sent or drafted.

## One-time GitHub configuration (required)

In **LeviMunk/levios-outreach → Settings → Secrets and variables → Actions → New repository secret**, add both:

- `SUPABASE_SERVICE_ROLE_KEY`: the existing project's server-side service-role key from Supabase Dashboard → Project Settings → API Keys (legacy service_role key; not a publishable key). This credential bypasses RLS, so limit repository collaborators and rotate it immediately if exposed. Never paste this secret into a GitHub issue, source code, chat, or public artifact.
- `OUTREACH_OWNER_USER_ID`: the UUID of the existing authorized Supabase Auth user that owns the Outreach Research Inbox. Locate it in Supabase Dashboard → Authentication → Users. Do not use a GitHub username or email address.

**No secrets were configured by this code commit.** Until both secrets are configured, the scheduled workflow's staging step fails closed, though its discovery and validation steps may produce a review artifact. The service key is used in a GitHub-hosted runner, not distributed to the website.

**Security:** This is a single-owner prototype with a high-privilege database key in a GitHub Actions secret. A narrower purpose-built ingestion API would be preferable for a larger system or a shared repository. Only trusted maintainers should be able to modify workflows, scripts, and the default branch. Consider branch protections and approval-gated environments.

## Validation

```sh
node --test tests/research-pack.test.mjs tests/discovery.test.mjs
node scripts/validate-research-pack.mjs research-output/candidates.json
```

The workflow does not establish that a site needs a service, that an OSM-listed website is correct, or that an email exists. **Review each business and research the actual opportunity before any contact.**

If the Overpass public service is busy or refuses the query, the job stops without staging fake prospects. Retry later or swap to a compliant licensed directory. Low-volume public endpoints should not be abused.

The staging deduplication checks existing Research Inbox batches. Existing prospects solely inside the encrypted private vault are hidden from the runner and will be skipped by the browser's own duplicate logic at import time.
