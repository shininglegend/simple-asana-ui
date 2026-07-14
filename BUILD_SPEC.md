# Build Spec: Asana Dashboard on Cloudflare Pages (OAuth, multi-user)

## Purpose & audience

This is an implementation spec for a coding model. It is complete on its own: do not invent scope beyond what's here. Where a value is unknown (client ID, workspace GID, domain), leave a clearly-marked `<<PLACEHOLDER>>` and list it in the "Values the human must fill in" section at the end so a human can drop them in.

## What we're building

A static front-end (already designed on claude design) hosted on **Cloudflare Pages**, backed by three **Pages Functions** that implement an **Asana OAuth 2.0 authorization-code flow**. Each user logs in as themselves; the app acts with their own Asana permissions and shows their own view. Access is restricted to members of one specific Asana workspace (Inner Excellence) so the public internet cannot use the deployment even though there is no per-user allowlist.

Explicitly **not** using: standalone Workers, `wrangler`-based Worker deploys, KV, D1, or any database. Tokens live in HttpOnly cookies. Pages Functions are the only server-side code, and they deploy automatically with the site (no separate deploy step).

## Architecture

```
Browser (static UI)
  │
  ├─ not logged in ──► GET /auth/login ──► 302 to Asana authorize page
  │                                             │
  │                        user approves ◄──────┘
  │                                             │
  │        Asana 302 back ──► GET /auth/callback?code=...
  │                              │  exchanges code -> tokens (server-side)
  │                              │  verifies workspace membership
  │                              │  sets HttpOnly cookies, 302 to /
  │
  └─ logged in ──► fetch /api/asana/<path> ──► Pages Function proxy
                        reads access_token from cookie
                        forwards to https://app.asana.com/api/1.0/<path>
                        refreshes token on 401, retries once
```

Three principles that must hold:

1. **The Asana client secret and all tokens never reach the browser.** Secret lives in an encrypted Pages env var. Tokens live in `HttpOnly; Secure` cookies the JS cannot read.
2. **The front-end never calls `app.asana.com` directly.** CORS forbids it and it would expose tokens. It calls the same-origin `/api/asana/...` proxy only.
3. **Workspace gate is enforced server-side in the callback**, not in the UI.

## Repo layout

```
/
├─ public/                     # static or react UI
│  ├─ index.html
│  ├─ app.js
│  └─ styles.css
├─ functions/
│  ├─ auth/
│  │  ├─ login.js              # GET /auth/login
│  │  ├─ callback.js           # GET /auth/callback
│  │  └─ logout.js             # GET /auth/logout
│  ├─ api/
│  │  └─ asana/
│  │     └─ [[path]].js        # ALL /api/asana/* - catch-all proxy
│  └─ _lib/
│     └─ cookies.js            # shared cookie parse/serialize + token refresh helper
└─ (no wrangler.toml needed for Pages Functions)
```

Cloudflare Pages auto-detects the `functions/` directory. `public/` is the build output
directory (set "Build output directory" = `public` in the Pages project settings).

## Authoritative docs (pull these before writing OAuth code)

Do not rely on training-data knowledge of the Asana API - fetch current docs first:

- **`https://developers.asana.com/llms.txt`** - Asana's own AI-agent index: all doc pages
  as Markdown plus endpoints as OpenAPI. Start here.
- OAuth flow: `https://developers.asana.com/docs/oauth`
- OAuth code samples: `https://developers.asana.com/docs/getting-started-with-asana-oauth`
- OAuth scopes: `https://developers.asana.com/docs/oauth-scopes`
- Rate limits: `https://developers.asana.com/docs/rate-limits`
- API reference: `https://developers.asana.com/reference`

> SCOPE OUT: This project deliberately does **not** use Asana "app components" (embedded
> widgets/modals/rule-actions inside Asana's own UI). Those require an external app server
> receiving requests _from_ Asana and go through a Security + QA review to publish. Our
> dashboard is the inverse - a standalone UI that pulls Asana data via REST + OAuth. Ignore
> app-components docs entirely.

## Asana OAuth reference (verify against current docs before relying on it)

- Authorize URL: `https://app.asana.com/-/oauth_authorize`
- Token URL: `https://app.asana.com/-/oauth_token`
- API base: `https://app.asana.com/api/1.0/`
- Access tokens expire in ~3600s (1 hour). Refresh tokens are long-lived. The token
  response includes `access_token`, `refresh_token`, `expires_in`, and a `data` object
  with the authenticated user.
- `GET /users/me` returns the current user including `workspaces`; used for the gate.

> NOTE FOR IMPLEMENTER: Asana's multi-user authorization is limited while an OAuth app is
> unverified - historically only members of the app-owning team can authorize, or there's a
> distinct-user cap, until the app is submitted for review. This does not change the code,
> but flag it in the README so the human knows to check the developer-console limit before
> expecting arbitrary teammates to log in. Do not attempt to work around it.

## File specifications

### `functions/_lib/cookies.js`

Export helpers used by the other functions.

- `parseCookies(request)` -> object of cookie name->value from the `Cookie` header.
- `serializeCookie(name, value, opts)` -> a `Set-Cookie` string. Default opts:
  `HttpOnly; Secure; SameSite=Lax; Path=/`. Accept `maxAge` (seconds) and `expires`.
- `clearCookie(name)` -> a `Set-Cookie` string that expires the cookie immediately
  (`Max-Age=0`).
- `refreshAccessToken(env, refreshToken)` -> POSTs to the token URL with
  `grant_type=refresh_token` and returns the new token JSON, or throws on failure.

Cookie names used across the app: `asana_at` (access token), `asana_rt` (refresh token),
`oauth_state` (short-lived CSRF state, cleared after callback).

### `functions/auth/login.js` - `GET /auth/login`

1. Generate a random `state` (`crypto.randomUUID()`).
2. Set `oauth_state` cookie (HttpOnly, Secure, SameSite=Lax, Max-Age=600).
3. 302-redirect to the authorize URL with query params:
   `client_id`, `redirect_uri` (= `env.ASANA_REDIRECT_URI`), `response_type=code`,
   `state`, and `scope` if the app is configured for granular scopes (default scope is
   fine for read + task write; document whichever is chosen).

### `functions/auth/callback.js` - `GET /auth/callback`

1. Read `code` and `state` from the query string.
2. Read `oauth_state` cookie; if it's missing or != `state`, return `403` (CSRF check).
3. POST to the token URL, `Content-Type: application/x-www-form-urlencoded`, body:
   `grant_type=authorization_code`, `client_id`, `client_secret` (= `env.ASANA_CLIENT_SECRET`),
   `redirect_uri`, `code`. Parse the JSON.
4. **Workspace gate:** either read the `data.workspaces`/`data` from the token response if
   present, or call `GET /users/me` with the new access token. Confirm that
   `env.ASANA_ALLOWED_WORKSPACE_GID` appears in the user's workspace list. If not, clear
   cookies and return `403` with a short "not authorized for this workspace" page.
5. On success, set cookies:
   - `asana_at` = access_token, `Max-Age` = `expires_in`.
   - `asana_rt` = refresh_token, `Max-Age` = a long value (e.g. 60 days).
   - Clear `oauth_state`.
6. 302-redirect to `/`.

All cookies HttpOnly, Secure, SameSite=Lax, Path=/.

### `functions/auth/logout.js` - `GET /auth/logout`

Clear `asana_at`, `asana_rt`, `oauth_state`; 302 to `/`.

### `functions/api/asana/[[path]].js` - `ALL /api/asana/*`

The catch-all proxy. `params.path` is an array of the path segments after `/api/asana/`.

1. Read `asana_at` from cookies. If absent, return `401` (front-end treats 401 as
   "redirect to /auth/login").
2. Build target URL: `https://app.asana.com/api/1.0/${params.path.join('/')}` + the
   incoming query string.
3. Forward the request: same method; `Authorization: Bearer <asana_at>`;
   `Content-Type: application/json`; body passed through for non-GET/HEAD.
4. **Refresh-on-401:** if Asana returns 401 and an `asana_rt` cookie exists, call
   `refreshAccessToken`, retry the request once with the new token, and attach a
   `Set-Cookie` updating `asana_at` (new `expires_in`) to the response. If refresh fails,
   return 401 so the front-end restarts login.
5. Return Asana's response body and status; set `Content-Type: application/json`. Do not
   forward Asana's CORS or auth headers back verbatim.

Never log token values.

## Front-end integration contract (for the UI the human supplies)

The coding model should wire the existing UI to these conventions; do not redesign the UI.

- To load data: `fetch('/api/asana/<endpoint>')`, e.g. `/api/asana/tasks?assignee=me&workspace=<gid>`.
- On any `401` from the proxy: redirect the browser to `/auth/login`.
- A "Log out" control links to `/auth/logout`.
- No Asana tokens or secrets in front-end code. The UI has no knowledge of tokens.

## Cloudflare Pages configuration (dashboard, done by human - document in README)

1. Create a Pages project connected to the repo. Build command: none. Build output
   directory: `public`.
2. Environment variables (mark **all as encrypted / secret**):
   - `ASANA_CLIENT_ID`
   - `ASANA_CLIENT_SECRET`
   - `ASANA_REDIRECT_URI` = `https://<<YOUR_PAGES_DOMAIN>>/auth/callback`
   - `ASANA_ALLOWED_WORKSPACE_GID`
3. In the Asana developer console, set the app's redirect URI to exactly match
   `ASANA_REDIRECT_URI`. A mismatch (including trailing slash) fails the flow.
4. Optional defense-in-depth: put Cloudflare Access (Zero Trust, free ≤50 users) in front
   of the Pages project with the M365/Entra tenant as IdP. This is redundant with the
   workspace gate but adds a tenant-level login wall; leave a toggle note in the README.

## Security checklist (implementer must satisfy all)

- [ ] Client secret only in env var, never in repo or client bundle.
- [ ] All token cookies `HttpOnly; Secure; SameSite=Lax`.
- [ ] `state` CSRF parameter generated, cookie-stored, and verified in callback.
- [ ] Redirect URI validated by exact match on Asana's side (config, not code).
- [ ] Workspace-membership gate enforced server-side in callback.
- [ ] Proxy returns 401 (not 500) when unauthenticated so the UI can re-auth.
- [ ] No token values written to logs or returned to the browser.
- [ ] Front-end only ever calls same-origin `/api/asana/*`, never `app.asana.com`.

## Testing

Provide, in the README, manual test steps: (a) unauthenticated visit -> redirected to
Asana login; (b) approve -> land back on `/` showing your Asana data; (c) member of a
different workspace -> 403; (d) let the access token expire (or delete `asana_at` cookie
while keeping `asana_rt`) and confirm the proxy silently refreshes and succeeds;
(e) `/auth/logout` clears session. Include `curl` examples for the 401 and 403 paths.

## Values the human must fill in

| Placeholder                   | Where it's used                        | How to get it                                                     |
| ----------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| `<<YOUR_PAGES_DOMAIN>>`       | `ASANA_REDIRECT_URI`, Asana app config | Cloudflare Pages project URL or custom domain                     |
| `ASANA_CLIENT_ID`             | env var, `login.js`                    | Asana developer console -> your OAuth app                         |
| `ASANA_CLIENT_SECRET`         | env var, `callback.js`                 | Asana developer console -> your OAuth app                         |
| `ASANA_ALLOWED_WORKSPACE_GID` | env var, `callback.js` gate            | `GET /workspaces` in the Asana API explorer, or the workspace URL |
| OAuth scope choice            | `login.js`, README                     | Asana developer console app settings                              |

## Deliverables

1. The five function files and `_lib/cookies.js` per spec.
2. A `README.md` covering: repo layout, the Pages dashboard setup above, the Asana
   developer-console steps, the multi-user authorization-limit caveat, env-var list, and
   the manual test steps.
3. No changes to the human-supplied UI beyond wiring the `fetch`/401/logout conventions.
