// ALL /api/asana/* — same-origin proxy to the Asana REST API. Reads the access
// token from the HttpOnly cookie, refreshes on 401 and retries once. Never logs
// or returns token values; the front-end has no knowledge of tokens.

import {
  API_BASE,
  clearCookie,
  parseCookies,
  refreshAccessToken,
  serializeCookie,
} from '../../_lib/cookies.js';

const REFRESH_TOKEN_MAX_AGE = 60 * 24 * 60 * 60; // 60 days

export async function onRequest({ request, env, params }) {
  const cookies = parseCookies(request);
  let accessToken = cookies.asana_at;
  const refreshToken = cookies.asana_rt;

  if (!accessToken && !refreshToken) {
    return unauthorized();
  }

  const url = new URL(request.url);
  const segments = Array.isArray(params.path) ? params.path : [];
  // Keep the proxy jailed under API_BASE: refuse traversal segments, and
  // re-encode each segment so a decoded "/" can't smuggle in extra ones.
  if (segments.length === 0 || segments.some((s) => s === '' || s === '.' || s === '..')) {
    return new Response(JSON.stringify({ errors: [{ message: 'Invalid path' }] }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const target = `${API_BASE}/${segments.map(encodeURIComponent).join('/')}${url.search}`;

  // Buffer the body up front so the request can be retried after a refresh.
  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const forward = (token) => {
    const headers = new Headers({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    });
    if (hasBody) {
      headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
    }
    return fetch(target, { method: request.method, headers, body });
  };

  const sessionCookies = [];

  // Access token expired (or its cookie already gone) — refresh, retry once.
  const refresh = async () => {
    if (!refreshToken) return false;
    let refreshed;
    try {
      refreshed = await refreshAccessToken(env, refreshToken);
    } catch {
      return false;
    }
    accessToken = refreshed.access_token;
    sessionCookies.push(
      serializeCookie('asana_at', refreshed.access_token, { maxAge: refreshed.expires_in }),
    );
    if (refreshed.refresh_token) {
      sessionCookies.push(
        serializeCookie('asana_rt', refreshed.refresh_token, { maxAge: REFRESH_TOKEN_MAX_AGE }),
      );
    }
    return true;
  };

  if (!accessToken && !(await refresh())) {
    return unauthorized();
  }

  let upstream = await forward(accessToken);
  if (upstream.status === 401 && sessionCookies.length === 0) {
    if (!(await refresh())) {
      return unauthorized();
    }
    upstream = await forward(accessToken);
  }

  // Rebuild the response rather than forwarding Asana's headers verbatim.
  const headers = new Headers({
    'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
  });
  for (const cookie of sessionCookies) {
    headers.append('Set-Cookie', cookie);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}

// 401 (not 500) so the front-end knows to restart login.
function unauthorized() {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', clearCookie('asana_at'));
  headers.append('Set-Cookie', clearCookie('asana_rt'));
  return new Response(JSON.stringify({ errors: [{ message: 'Not authenticated' }] }), {
    status: 401,
    headers,
  });
}
