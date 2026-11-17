# JobOS automated local-first research

## Status as of November 17, 2026

- **Deployed:** owner-only Supabase Research Inbox, signed GitHub OIDC Edge Function (version 3), and encrypted browser importer capable of preserving Career and Business records.
- **Configured:** the GitHub Actions workflow `.github/workflows/weekly-research.yml` runs on weekdays at 14:17 UTC (8:17 AM CST / 9:17 AM CDT), and can be dispatched manually through GitHub.
- **Verification outstanding:** a complete scheduled GitHub Actions → OIDC → Supabase → unlocked cloud vault run has not yet been observed. Do not treat a successful deploy or static tests as proof of end-to-end production operation.
- **Current staging:** two queued research batches, including an employer-hosted Michels Corporation Global Automation Analyst posting for Neenah. Staged means waiting for the authenticated cloud-linked browser to import and encrypt records; it is not an application.
- **Separate ChatGPT automation:** JobOS Local-First Intake provides research and prep, but does not itself have permission to insert into the GitHub OIDC staging endpoint. The GitHub Actions collector is the direct source producer.

## Workflow

1. `scripts/discover-jobs.mjs` queries a fixed, reviewable set of employer-hosted Greenhouse and Lever job boards. The board list is not exhaustive; some boards may return 404, transient errors, or no relevant openings.
2. Rejects irrelevant job titles, unknown Wisconsin eligibility and unsupported locations. Uses approximate Appleton-to-city-center distances only for a conservative local-first *ranking*. These are not verified workplace addresses or driving distances.
3. Extracts salary only when an explicit dollar salary range is parsable. Unknown pay and application friction remain unknown; no field should be invented to inflate fit scores.
4. On Mondays, `scripts/discover-prospects.mjs` may add directory-backed business opportunities. `scripts/combine-research.mjs` prioritizes local jobs, then eligible remote jobs, then business records, with at most 12 per signed batch.
5. `scripts/validate-jobos-pack.mjs` rejects unsupported employers/URLs, remote eligibility without evidence markers, drafts, emails, and job applications.
6. The workflow obtains a short-lived GitHub OIDC token and submits to `outreach-research-intake`. The Edge Function verifies issuer, audience, repository, workflow path, branch, event, token validity and cryptographic signature, then validates each record again.
7. The Edge Function rejects duplicates by normalized career posting URL or business identity and filters exact **Passed** keys from an owner-only feedback table.
8. JobOS `cloud.js` imports queued batches only when the authenticated owner is using an unlocked, synchronized vault. The app preserves `Career` as `Career` (fixed November 17), strips any send/application fields, deduplicates against the actual vault, encrypts/syncs, then acknowledges the queued research batch.
9. Clicking **Pass** stores the reason locally in the encrypted vault. When cloud sync is linked, JobOS also upserts the public opportunity key and rejection reason to `outreach_research_feedback` under RLS scoped to the authenticated owner. The server uses this feedback to suppress exact previously passed opportunities on future intake; it does **not** train a statistical model, infer new user preferences, or expose resumes and messages.

## Scope and operational limits

This pipeline currently uses employer ATS boards, not every local employer job site. There is no guarantee of 5–10 suitable openings per day. Missing matches should produce no invented opportunities. Full ATS document generation, hiring-contact verification, low-friction application checks and application submission still require separate workflows and user review. Outbound messages and submitted applications are **never** generated merely by research staging.

## Verify

- GitHub Actions: [JobOS research workflow](https://github.com/LeviMunk/levios-outreach/actions/workflows/weekly-research.yml)
- GitHub Actions: [JobOS intake checks](https://github.com/LeviMunk/levios-outreach/actions/workflows/jobos-ci.yml)
- Check `research-output/job-report.json`, `research-output/report.json` and the workflow job logs for validated and staged counts.
- Supabase: confirm `outreach-research-intake` is active and `outreach_research_feedback` has RLS/owner-only policies.
- Browser: open JobOS, unlock existing encrypted vault, confirm Cloud & Gmail shows linked sync, and inspect Research Inbox status. Confirm Career postings appear in Employment without being reclassified as Business and that cloud acknowledgement follows import.
- Test Pass on a real unneeded item and confirm future source deduplication uses that exact opportunity key after encrypted vault sync and owner-only feedback sync.

