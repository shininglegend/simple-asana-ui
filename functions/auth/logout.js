// GET /auth/logout — clear the session cookies and return to the app.

import { clearCookie } from '../_lib/cookies.js';

export async function onRequestGet() {
  const headers = new Headers({
    Location: '/',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
  });
  headers.append('Set-Cookie', clearCookie('asana_at'));
  headers.append('Set-Cookie', clearCookie('asana_rt'));
  headers.append('Set-Cookie', clearCookie('oauth_state'));
  return new Response(null, { status: 302, headers });
}
