# LeviOS Outreach · Cloud + Gmail deployment

This application is operational in **encrypted browser-local mode**. The new Supabase cloud and Gmail controls are implemented but **not live** until you configure a Supabase project and deploy the SQL/Edge Function. No private data or secrets should be committed to GitHub.

## Step 1: Create Supabase project and your single user

1. Sign into [Supabase Dashboard](https://supabase.com/dashboard). Create a new project named `levios-outreach`. Choose a strong database password.
2. Open **SQL Editor** and run the complete migration `supabase/migrations/20261115000000_outreach_cloud.sql`.
3. Under **Authentication → Users**, create/invite the authorized user `levivanstap@gmail.com` (this is needed because the application uses `shouldCreateUser: false` in passwordless sign-in).
4. Under **Authentication → URL Configuration**, set your Site URL to the actual published LeviOS Outreach URL and add it to allowed redirect URLs. Existing custom-domain deployments may be `https://levimunk.com/levios-outreach/`; verify the actual GitHub Pages URL first. Prefer adding both canonical and GitHub project URL if both can be visited.
5. Disable open/public signups if this is strictly a one-person private workspace. The SQL additionally restricts access to the authorized owner email.
6. Under project **API Keys**, obtain the **Project URL** and **public publishable key** (`sb_publishable_...`, or a legacy anon JWT). **Never enter a service-role or secret key in the public browser UI.**

## Step 2: Connect the encrypted vault

1. Open the live app, unlock or create the local vault, and export an encrypted backup.
2. Click **Cloud & Gmail** in the sidebar.
3. Enter the Supabase project URL and **public** key, save, and request a magic-link sign-in to `levivanstap@gmail.com`.
4. Follow the sign-in link in the same browser profile where you started authentication. Return to **Cloud & Gmail**.
5. If no remote vault exists, choose **Upload browser vault and enable sync**.
6. If a remote vault already exists, choose whether to **restore remote** or **replace remote** after exporting an encrypted backup. Replacement requires two confirmations.
7. On a second device, configure the same public project values, sign in, select **Restore cloud to browser**, and unlock using the original vault passphrase.

### Synchronization rules

- Supabase holds the encrypted vault envelope only (`salt`, `iv`, `ciphertext`, `version`), not your decrypted records.
- Updates write to local encrypted storage first, then to cloud.
- Uploads use optimistic revision checks. If another device writes first, synchronization stops instead of overwriting that device.
- **This first version cannot merge simultaneous edits across devices.** Use one device at a time; export backups before resolving a conflict.
- If the cloud service is unreachable, local storage continues functioning. Recheck the cloud connection and resolve any revisions when back online.
- Local storage, login session, and publishable project settings live in that browser profile. Clearing browser data without a backup can destroy local changes.
- Gmail integration is **not required** for cloud sync.

## Step 3: Optional Gmail OAuth (separate authorization)

This requires your own **Google Cloud project** and **Supabase Edge Function**. The ChatGPT Gmail connector does not authorize an external app.

1. In [Google Cloud Console](https://console.cloud.google.com/), create/select a project and enable the **Gmail API**.
2. Configure the OAuth consent screen. In *Testing* mode, add `levivanstap@gmail.com` as an authorized test user. Gmail readonly and compose are restricted scopes and may require verification/security review for broader production distribution.
3. Create an OAuth **Web application** client.
4. Add this exact authorized redirect URI, using your own Supabase project reference:
   `https://YOUR_PROJECT_REF.supabase.co/functions/v1/gmail-bridge`
5. Set the following Supabase **Edge Function secrets** (server-side only):
   - `GMAIL_CLIENT_ID`: Google OAuth client ID
   - `GMAIL_CLIENT_SECRET`: Google OAuth client secret
   - `GMAIL_TOKEN_ENCRYPTION_KEY`: base64 of 32 cryptographically random bytes, e.g. output of `openssl rand -base64 32`
   - `GMAIL_OAUTH_STATE_SECRET`: a separate random string of at least 32 characters
   - `LEVIOS_APP_URL`: exact live application URL (including trailing slash), e.g. `https://levimunk.com/levios-outreach/`
6. The function reads the Supabase service-role secret from the server environment. Never publish it.
7. Deploy the SQL migration first, then the Edge Function.

### Example terminal setup (fish shell)

Install a current Node.js version, then in the cloned `levios-outreach` repo:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Prepare a local `.env.gmail` with the secrets above. The repository `.gitignore` excludes `.env*`. Then:

```sh
npx supabase secrets set --env-file .env.gmail
npx supabase functions deploy gmail-bridge --no-verify-jwt
```

The OAuth callback must be reachable without a Supabase JWT; the function verifies HMAC-signed, short-lived OAuth state on that callback and checks the Supabase user JWT on all browser POST actions. Its CORS origin is restricted by `LEVIOS_APP_URL`.

### Gmail features once connected

- **Check connection:** shows whether the Gmail account is authorized.
- **Connect Gmail:** starts Google's separate OAuth consent process.
- **Gmail Draft** in each Email prospect's outreach card creates a *real Gmail draft*, with idempotency protection.
- **Inspect tracked email activity:** checks Gmail metadata only for addresses corresponding to confirmed sends in your currently unlocked vault; returns message IDs, thread IDs, headers and sent/inbox flags. It **does not automatically mark any record sent or replied** until robust thread matching and review are implemented.
- This implementation has **no automatic sending**, bulk sending, or follow-up spam. Any outgoing email still requires your explicit action inside Gmail.
- Google refresh tokens are AES-GCM encrypted at rest with the server-side key. The encryption key must be backed up privately. Losing the key requires reconnecting Gmail.

## What cannot be completed from GitHub alone

- Creating the Supabase database/project, enabling its email identity, and running SQL migrations.
- Creating Google OAuth credentials and consenting to restricted Gmail scopes.
- Setting server secrets and deploying the Gmail Edge Function.

These steps require authorization inside the respective provider accounts. Until completed, the browser-local outreach tool remains available.

## Verify

GitHub Actions runs `node --check` on browser and Edge Function sources plus static security invariants. These are **not full integration tests**. Before using real private records for cloud synchronization or Gmail operations, verify sign-in, RLS separation, encrypted backup/restore, CAS conflicts, Gmail OAuth callback, token renewal, idempotent draft creation, and error handling against your own test project.

Sources: [Supabase auth/redirect docs](https://supabase.com/docs/guides/auth/redirect-urls), [Supabase function security](https://supabase.com/docs/guides/functions/auth), [Gmail OAuth web server flow](https://developers.google.com/workspace/gmail/api/auth/web-server), [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes).
