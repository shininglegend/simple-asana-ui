// GET /auth/callback — exchange the authorization code for tokens, enforce the
// workspace-membership gate server-side, then set session cookies.

import {
  API_BASE,
  TOKEN_URL,
  clearCookie,
  parseCookies,
  serializeCookie,
} from '../_lib/cookies.js';

const REFRESH_TOKEN_MAX_AGE = 60 * 24 * 60 * 60; // 60 days

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // CSRF check: state must match the value we set in /auth/login.
  const cookies = parseCookies(request);
  if (!code || !state || !cookies.oauth_state || cookies.oauth_state !== state) {
    return deny(403, 'Invalid login attempt. Please try logging in again.');
  }

  // Exchange the code for tokens (server-side; the secret never leaves here).
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.ASANA_CLIENT_ID,
      client_secret: env.ASANA_CLIENT_SECRET,
      redirect_uri: env.ASANA_REDIRECT_URI,
      code,
    }),
  });
  if (!tokenRes.ok) {
    return deny(403, 'Login failed. Please try again.');
  }
  const tokens = await tokenRes.json();

  // Workspace gate: the token response's `data` object only carries the user's
  // gid/name/email, so ask the API for the user's workspaces.
  const meRes = await fetch(`${API_BASE}/users/me?opt_fields=workspaces.gid`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!meRes.ok) {
    return deny(403, 'Could not verify your Asana account. Please try again.');
  }
  const me = await meRes.json();
  const workspaces = me.data?.workspaces || [];
  const allowed = workspaces.some((ws) => ws.gid === env.ASANA_ALLOWED_WORKSPACE_GID);
  if (!allowed) {
    return deny(403, 'Your Asana account is not a member of this workspace.');
  }

  const headers = new Headers({ Location: '/' });
  headers.append(
    'Set-Cookie',
    serializeCookie('asana_at', tokens.access_token, { maxAge: tokens.expires_in }),
  );
  headers.append(
    'Set-Cookie',
    serializeCookie('asana_rt', tokens.refresh_token, { maxAge: REFRESH_TOKEN_MAX_AGE }),
  );
  headers.append('Set-Cookie', clearCookie('oauth_state'));
  return new Response(null, { status: 302, headers });
}

// 403 page that also clears any session cookies.
function deny(status, message) {
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8' });
  headers.append('Set-Cookie', clearCookie('asana_at'));
  headers.append('Set-Cookie', clearCookie('asana_rt'));
  headers.append('Set-Cookie', clearCookie('oauth_state'));
  const body = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Not authorized</title></head>
  <body>
    <h1>Not authorized</h1>
    <p>${message}</p>
    <p><a href="/auth/login">Try again</a></p>
  </body>
</html>`;
  return new Response(body, { status, headers });
}
