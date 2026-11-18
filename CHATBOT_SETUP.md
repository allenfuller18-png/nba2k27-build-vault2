# Build Vault AI — secure setup

The floating chat UI and backend code are committed. Chat replies require **two private Cloudflare Worker secrets**, plus sign-in to the existing Supabase Vault account.

## 1. Enable the backend

This repository now has:
- `worker.js`: API handler at `POST /api/chat`, forwards requests to OpenAI, and serves existing static assets.
- `wrangler.toml`: existing Worker name `nba2k27-build-vault2` and assets deployment configuration.
- `chat-ui.js`: floating chat UI across all tabs.
- `.assetsignore`: prevents server files, SQL, and config docs from being exposed through static hosting.

In Cloudflare → Workers & Pages → **nba2k27-build-vault2** → Settings → Variables and Secrets, add:

| Name | Type | Value |
|---|---|---|
| `OPENAI_API_KEY` | **Secret** | Your OpenAI API key (create one in OpenAI Platform) |
| `VAULT_AI_ALLOWED_EMAIL` | **Secret** | The exact email address you use to sign in to Vault Cloud Sync |

Do **not** paste either secret into GitHub, `config.js`, `index.html`, or chat messages.

Ensure the Cloudflare Worker deployment uses the repository `wrangler.toml` and `worker.js` (and that the `ASSETS` binding is enabled). If your project is currently configured as **static-assets-only**, change its Worker build/deploy command to `npx wrangler deploy` from the repository root. Cloudflare Git deployments may need that command explicitly.

After saving the secrets, redeploy to make sure the new Worker code and bindings are active.

## 2. Open the chatbot

Visit your deployed Vault → click **☁ Sign in** → complete the email login → click **✦ Build Vault AI** at bottom right.

Ask, for example: `Compare my Paint Terror centers for REC`.

Chat uses a *current snapshot* of the builds in this browser, including individual cap-breaker allocations and planned ratings. It never edits those builds.

## 3. Security and cost

- The chatbot is available only to a verified Supabase Vault login matching the email in `VAULT_AI_ALLOWED_EMAIL`.
- The OpenAI key is used only inside the Cloudflare Worker and is never sent to the browser.
- Chat requests send up to 35 sanitized builds (name, dimensions, ratings, notes, cap breakers) and up to 12 messages to the OpenAI API. This content leaves your site to generate an answer.
- Chats stay in the current browser tab session storage; they are not synced to Supabase and are not saved by the API (`store:false`). Clear chat using ↺.
- API usage is **billed independently** from ChatGPT Plus/Pro. Configure OpenAI Platform billing budgets/alerts and Cloudflare rate limits if desired. A budget notification is not necessarily a hard usage cutoff.
- Responses may be incorrect. The assistant uses saved build caps and will not claim to know current purchased attributes or verified 2K27 meta.
- If you see “AI is not configured,” check both secrets and deployment. If you see “Sign in,” complete Vault Cloud Sync login.

This project uses the Responses API with model `gpt-4.1-mini`, output limit 650 tokens per answer.
