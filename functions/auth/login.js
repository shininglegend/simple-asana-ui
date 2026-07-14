// GET /auth/login — start the Asana OAuth authorization-code flow.

import { AUTHORIZE_URL, serializeCookie } from '../_lib/cookies.js';

export async function onRequestGet({ env }) {
  const state = crypto.randomUUID();

  const authorize = new URL(AUTHORIZE_URL);
  authorize.searchParams.set('client_id', env.ASANA_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', env.ASANA_REDIRECT_URI);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('state', state);
  // "default" requires the app to be registered with Full permissions in the
  // Asana developer console. Set ASANA_OAUTH_SCOPE (space-delimited) to use
  // granular scopes instead — they must also be registered on the app first.
  authorize.searchParams.set('scope', env.ASANA_OAUTH_SCOPE || 'default');

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      'Set-Cookie': serializeCookie('oauth_state', state, { maxAge: 600 }),
    },
  });
}
