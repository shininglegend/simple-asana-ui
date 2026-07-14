// Shared cookie helpers + token refresh.
// Cookie names used across the app: asana_at (access token), asana_rt (refresh
// token), oauth_state (short-lived CSRF state).

export const TOKEN_URL = 'https://app.asana.com/-/oauth_token';
export const AUTHORIZE_URL = 'https://app.asana.com/-/oauth_authorize';
export const API_BASE = 'https://app.asana.com/api/1.0';

export function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  const cookies = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (!name) continue;
    const value = part.slice(eq + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      // Malformed percent-encoding must not turn into a 500 — keep it verbatim.
      cookies[name] = value;
    }
  }
  return cookies;
}

export function serializeCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'HttpOnly', 'Secure', 'SameSite=Lax'];
  parts.push(`Path=${opts.path || '/'}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  return parts.join('; ');
}

export function clearCookie(name) {
  return serializeCookie(name, '', { maxAge: 0 });
}

export async function refreshAccessToken(env, refreshToken) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.ASANA_CLIENT_ID,
      client_secret: env.ASANA_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    // Never include response body here: error bodies from the token endpoint
    // are safe, but keeping this a bare status avoids any token leakage path.
    throw new Error(`Token refresh failed (status ${res.status})`);
  }
  return res.json();
}
