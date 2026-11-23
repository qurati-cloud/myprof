# MyProf AI backend

The backend and first-party admin dashboard are in `worker/src`. The public MyProf website on GitHub Pages remains separate.

## Ready in GitHub

- `wrangler.toml`: production D1 + R2 bindings.
- `src/index.js`: authenticated Worker API, health check, admin bootstrap, protected draft creation and image upload.
- `src/admin-page.js`: admin UI served directly on the Worker hostname (first-party sessions).
- `schema.sql` and `migrations/0002_social_posts.sql`: D1 schema and draft table.
- `.github/workflows/deploy-worker.yml`: optional Cloudflare deployment after adding a GitHub secret.

## Deployment (one-time account authorization)

1. Create a restricted Cloudflare API token with Workers deployment permission for this account.
2. Add it as `CLOUDFLARE_API_TOKEN` to repository Actions secrets in GitHub. **Do not put the token in any public file, chat, or workflow source.**
3. Run **Actions → Deploy MyProf AI API → Run workflow** once. Afterward, commits changing `worker/**` will deploy the Worker automatically.
4. Verify `https://myprof-ai-api.quraaty.workers.dev/api/health` returns version `1.2`. Deployment of code must be confirmed before proceeding.

## Admin account bootstrap (one-time)

1. In Cloudflare Worker dashboard **Settings → Variables and secrets**, create a Secret named `ADMIN_SETUP_TOKEN` with a long random value (32+ characters).
2. Open `https://myprof-ai-api.quraaty.workers.dev/admin/setup` and enter your email, a strong unique password (14+ characters) and your setup token. All values stay within your browser/Cloudflare.
3. After the account is created, delete the `ADMIN_SETUP_TOKEN` Secret from Worker settings; deploy the changed Worker version if Cloudflare requests confirmation.
4. Log in at `https://myprof-ai-api.quraaty.workers.dev/admin`.

Never enter or share passwords or the Cloudflare API token in ChatGPT.

## Limitations and security

- Social posts are saved **as drafts only**; automatic publication to Meta, TikTok, YouTube is **not active** until each platform's official authorization and publishing implementation have been separately tested.
- R2 uploads support JPG/PNG/WebP images up to 8 MB, not PDF storage. Uploaded images are publicly readable by their unguessable Worker media URLs; never upload private documents using this image endpoint.
- Payhip events and GitHub publication workflows require further implementation. No sales data is automatically imported yet.
- The current admin UI is hosted on the Worker domain, not under `myprof.ca/admin`. A later same-origin route/redirect can be added without exposing account data.
- No public file or public website contains credentials. The HTML/CSS/JavaScript of the admin UI itself is not confidential; the private API restricts data by authenticated session.
- Add login rate limiting and further operational checks before broader production use.
