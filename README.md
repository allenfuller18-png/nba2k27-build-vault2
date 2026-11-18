# NBA 2K27 Build Vault — Online + Cloud Sync

This is your existing mobile/desktop Build Vault converted into a static website with private per-account cloud saving. It includes the same 11 original builds, editable stats and rankings, comparisons, and **Based on Legends** with Hakeem.

## What you need

- A free [Supabase](https://supabase.com/dashboard) account and project (database + email sign-in)
- A [GitHub](https://github.com/new) repository and [Cloudflare Pages](https://dash.cloudflare.com/) account (hosting + automatic redeployments)

**No server programming or paid plan is required to get started within free-tier limits.** Account creation and hosting setup require your own login. You do **not** share any password or secret key with ChatGPT.

## Step 1 — Create Supabase database

1. Create a Supabase project.
2. Go to **SQL Editor** → New Query; paste **all** of `supabase.sql` and click Run.
3. Go to **Authentication → Providers → Email** and enable email sign-in / magic links.
4. Go to **Project Settings → API** (or **Connect**): copy the **Project URL** and **publishable/anon** key. Never use the `service_role` or secret key in the browser.
5. Put these two values into `config.js`:

   ```js
   window.VAULT_CONFIG = {
     supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
     supabaseAnonKey: 'YOUR-PUBLISHABLE-OR-ANON-KEY'
   };
   ```

6. The `build_vaults` table uses Row Level Security (RLS). Only the signed-in account can read or change its own data; the sync function checks revisions before saving to avoid accidentally overwriting another device.

## Step 2 — Upload to GitHub

1. Create a new repository, for example `nba2k27-build-vault`.
2. Upload the **contents** of this folder to the repository root: `index.html`, `cloud.js`, `config.js`, `supabase.sql`, and `README.md`.
3. Prefer a **private** repository if you don't want the source or Supabase project URL publicly visible. The publishable/anon key is designed to be public, but never include a secret key. The deployed website itself will be publicly reachable; the **build data** is private behind email sign-in and RLS.

## Step 3 — Deploy to Cloudflare Pages

1. Cloudflare Dashboard → **Workers & Pages** → **Create application → Pages → Connect to Git**.
2. Connect your GitHub repo; use `main` as the production branch.
3. Framework preset: **None**. Build command: **blank** (or `exit 0`, if required). Output directory: `.`.
4. Click **Save and Deploy**. Cloudflare gives you a permanent `*.pages.dev` URL.
5. Back in Supabase → **Authentication → URL Configuration**:
   - **Site URL** = your actual `https://...pages.dev` URL
   - **Redirect URLs** = add `https://...pages.dev/**` (and any custom domain you later use).
6. Open the Pages URL and press **☁ Sign in**. Enter your email and follow the magic link in your inbox. When signed in, the Vault initializes its cloud copy automatically.

**Do not try to log in to this cloud version using a `file://` URL.** Email redirect authentication requires an actual hosted HTTPS address.

## Step 4 — Access from phone and desktop

- Open the **same Pages URL** on both devices and sign in with the **same email**.
- Edit or add a build. The cloud control changes to “Saving…” and then “Cloud synced”.
- Other devices check for updates about every 20 seconds, and when the tab regains focus. Reload if you don't see a recent update.
- Your Mobile/Desktop/Auto choice stays device-specific.
- The **Based on Legends** tab allows any additional build to be tagged as legend-inspired.

## How to migrate edits from the old local HTML file

Because `file://` pages and hosted pages have different storage origins, changes to the emailed/offline HTML file do **not** automatically transfer.

1. Open the **old** Build Vault, click **Export**, and save its JSON backup.
2. Sign in to the **new hosted** Build Vault.
3. Click **Import**, select that JSON file, and confirm the replacement.
4. Wait until the Cloud button displays **Cloud synced**.

The 11 baseline builds are included already; you only need import if your old file contains personal edits you want to keep.

## Updates without downloading new HTML files

- **Editing builds:** Changes sync to your Supabase database automatically. No GitHub push or redeploy needed.
- **Updating site features/code:** Update files in your GitHub repo; Cloudflare Pages automatically deploys new commits. You do not need to send HTML files by email again. ChatGPT cannot push updates from another conversation unless GitHub access/integration is set up.

## Safety and limitations

- The database is private by authenticated user, **not end-to-end encrypted**. The site code is public to visitors even with a private GitHub repository because browsers must load it.
- Conflict protection prevents silent overwrites: if another device saved changes first, you are asked whether to adopt the remote copy or intentionally overwrite it. **Export a JSON backup** first if both contain important edits.
- If your internet connection fails, changes remain in local browser storage and show a sync error; revisit the site and press **Sync now** once online. Export a backup if unsure.
- Keep backups periodically. Supabase free projects have inactivity and resource limits that can change.
- The source is ready for deployment, but no website or Supabase project has been provisioned by ChatGPT. Hosting, email auth, and cross-device sync only become active after you perform the setup above.

## Files

- `index.html` — your Build Vault UI
- `cloud.js` — sign-in, conflict-aware autosave, sync and session management
- `config.js` — **your** Supabase project public settings (fill before deployment)
- `supabase.sql` — authenticated user table, RLS policies, and atomic save function
- `README.md` — these instructions
## Build Vault AI troubleshooting (15-build website)

The floating **Build Vault AI** chat sends authenticated requests to `POST /api/chat`. The source supports two deployment types:

- **Cloudflare Workers with static assets**: `worker.js` and `wrangler.toml` serve the site and the API.
- **Cloudflare Pages (Git-connected)**: `functions/api/chat.js` creates the same API route and reuses `worker.js`. Make sure the Pages deployment includes the `functions` folder; a static-only upload will not execute the chat backend.

In your **actual deployed** Cloudflare Worker or Pages project, add these two **Secrets** in **Settings → Variables and Secrets** (do not add the values to GitHub, `config.js`, or browser code):

1. `OPENAI_API_KEY`: a valid OpenAI API key with API billing/quota enabled (ChatGPT subscription access does not provide API credits).
2. `VAULT_AI_ALLOWED_EMAIL`: the exact email address used to sign into your Vault through Supabase Cloud Sync.

Deploy after adding secrets. Open your site's own URL and visit `/api/chat` in the browser: a **JSON** `Method not allowed` response (HTTP 405) indicates the API route is deployed. A Cloudflare/static HTML 404 indicates it is not deployed. Then sign in through **☁ Cloud Sync** and try a question in Build Vault AI. If the chat reports that the AI is not configured, verify the secrets on the deployed project (Production as well as Preview if used); if it reports unauthorized, verify the allowed email; if it reports API quota, check your OpenAI API platform billing.

Do not paste API keys into the chat or into GitHub. These steps configure runtime credentials, which cannot be recovered from repository source code.
