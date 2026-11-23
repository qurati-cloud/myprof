# MyProf AI Worker

This folder contains the private API backend for the MyProf administration system.

## Current status

- `src/index.js`: Worker API foundation (health check, one-time admin bootstrap, login/logout, session validation, product listing, sales summary).
- `schema.sql`: D1 schema for administrators, sessions, products, media metadata, Payhip events, and audit log.
- `wrangler.toml`: deployment configuration template.

The API is **not ready to receive private data yet**. It must first be deployed with a real D1 binding and secrets.

## One-time Cloudflare setup

1. In Cloudflare, open **Storage & databases → D1 SQL Database → Create**.
2. Name it exactly `myprof-ai-db`.
3. Copy its Database ID. Do not share account passwords or API tokens in chat.
4. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.toml` with that ID.
5. In the D1 database, open **Console** and execute the complete contents of `schema.sql`.
6. In the Worker settings, add these secrets:
   - `ADMIN_SETUP_TOKEN`: a long random one-time setup token (at least 32 random characters).
7. Keep the Worker route on its existing `workers.dev` hostname for now. Do not change MyProf DNS.
8. Deploy this Worker from the `worker` directory using Wrangler, or connect this repository to Cloudflare Workers Builds with `worker` as the root directory.

## Initialize the first administrator

After D1 is bound and the Worker is deployed, send a POST request to:

`/api/admin/setup`

Headers:
- `Content-Type: application/json`
- `X-Setup-Token: <the ADMIN_SETUP_TOKEN>`

JSON body:
`{"email":"YOUR_ADMIN_EMAIL","password":"A-unique-password-at-least-14-characters"}`

The setup endpoint only works while no admin user exists. After successful initialization, delete the `ADMIN_SETUP_TOKEN` secret from the Worker settings and redeploy.

## Security notes

- Never put secrets in `app.js`, `index.html`, GitHub Pages files, or public JSON.
- Admin session cookies are HttpOnly, Secure, and SameSite=Strict.
- Do not store Payhip customer details unless strictly necessary. Store only redacted event metadata for aggregate reporting.
- The current API does not yet implement AI calls, file uploads, Payhip webhook signature verification, product editing, or publishing to the public site. Those are subsequent implementation tasks.
