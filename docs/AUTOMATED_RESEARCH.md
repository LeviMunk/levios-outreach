# Automated research: configured without GitHub secrets

The weekly research pipeline is now GitHub Actions → short-lived GitHub OIDC token → Supabase `outreach-research-intake` Edge Function → owner-only research batch queue. **You do not need to configure a service-role key, user UUID, or any other GitHub Action secret.**

- [Scheduled workflow](../.github/workflows/weekly-research.yml)
- [Identity-verified intake source](../supabase/functions/outreach-research-intake/index.ts)
- [LeviOS Outreach Actions](https://github.com/LeviMunk/levios-outreach/actions/workflows/weekly-research.yml)

## Schedule and operation

GitHub schedules it every Monday at **14:17 UTC (8:17 AM CST / 9:17 AM CDT)**. GitHub may delay cron runs. Alternatively, open the Actions link above and choose **Run workflow**.

The workflow queries low-volume public OpenStreetMap business directory entries in bounded Madison/Milwaukee areas. It selects up to 12 service-business candidates, includes their source links and a clearly hypothetical opportunity, and never guesses email contacts. It verifies JSON shape, then requests an identity token from GitHub's OIDC service for audience `levios-outreach-research`. Only the specific `LeviMunk/levios-outreach/.github/workflows/weekly-research.yml` workflow on the `main` branch, triggered by cron or manual dispatch, can use this token to stage data. The Edge Function validates the GitHub JWT **signature** using GitHub's published public key, as well as audience, issuer, project/repository/ref/workflow/event/time claims. It does not trust an unauthenticated JSON payload or a caller-provided owner ID.

Supabase service-role credentials remain **server-side inside Supabase-managed Edge Function environment**, not GitHub and not the client application. The endpoint is configured `verify_jwt=false` intentionally because it verifies GitHub identity tokens itself rather than Supabase tokens. Server-side checks reject unverified directory submissions and non-research records.

The endpoint reads existing staged research to filter duplicates, associates new candidates with the already-authorized owner, and stages them for import. After the user unlocks the cloud-synced encrypted LeviOS vault in the browser, the existing client-side intake imports and encrypts each batch. No draft, email, or confirmation of sending occurs automatically.

## Important limitations

- OpenStreetMap business listings may be stale or inaccurate. These are **candidate prospects, not verified business opportunities**.
- The backend compares against queued and processed research batches. It cannot directly inspect the owner's encrypted existing leads; the browser performs additional deduplication during import.
- Public Overpass instances may be rate-limited or unavailable. If discovery fails, the workflow fails without fabricating a lead.
- No proof that a company needs automation, nor any verified decision-maker email, is provided.
- The workflow's first successful full end-to-end run and the next scheduled run should be checked in GitHub Actions.
- The Supabase Edge Function's self-authorizing trust requires repository/workflow security: protect `main`, restrict workflow editing to trusted collaborators and avoid unreviewed pull request merges.
- Existing ChatGPT scheduled tasks are not involved.

## Check

Run GitHub Actions **LeviOS Outreach checks** to verify code syntax and discovery tests. The weekly workflow's run logs/report show actual staged/skipped counts. Without a real execution, the pipeline is **deployed but not operationally verified**.
