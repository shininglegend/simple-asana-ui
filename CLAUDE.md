# simple-asana-ui

Asana dashboard hosted on Cloudflare Pages: a static front-end in `public/` plus Pages Functions in `functions/` implementing an Asana OAuth 2.0 authorization-code flow and a same-origin API proxy. **`BUILD_SPEC.md` is the authoritative spec — read it before implementing or changing any auth/proxy behavior, and do not invent scope beyond it.**

## Commands

- `npm run dev` — local dev server via `wrangler pages dev public` (serves static files + functions)
- `npm run build` — compiles `functions/` with `wrangler pages functions build` (validation only; Cloudflare Pages builds functions itself on deploy)
- `npm run lint` — ESLint (flat config in `eslint.config.js`)
- `npm run format` / `npm run format:check` — Prettier write / check

Run `npm run lint`, `npm run format:check`, and `npm run build` before committing.

## Layout

- `public/` — static UI (Pages build output directory). Human-supplied design; wire it to the fetch/401/logout contract in BUILD_SPEC.md, don't redesign it.
- `functions/auth/` — `login.js`, `callback.js`, `logout.js` (OAuth flow)
- `functions/api/asana/[[path]].js` — catch-all proxy to `https://app.asana.com/api/1.0/`
- `functions/_lib/cookies.js` — cookie parse/serialize + token refresh helpers

## Hard constraints (from the spec)

- Plain JS, no framework, no bundler. No standalone Workers, no `wrangler.toml`, no KV/D1/database. Wrangler is a dev/CI tool only; deploys happen automatically via Cloudflare Pages git integration.
- The Asana client secret and tokens must never reach the browser: secrets in Pages env vars (`ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET`, `ASANA_REDIRECT_URI`, `ASANA_ALLOWED_WORKSPACE_GID`), tokens in `HttpOnly; Secure; SameSite=Lax` cookies (`asana_at`, `asana_rt`, `oauth_state`).
- The front-end only calls same-origin `/api/asana/*`, never `app.asana.com` directly.
- Workspace-membership gate is enforced server-side in the callback.
- Never log token values. Proxy returns 401 (not 500) when unauthenticated.
- Don't rely on training-data knowledge of the Asana API — fetch current docs first, starting at `https://developers.asana.com/llms.txt`.
