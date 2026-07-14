// GET /auth/login (see BUILD_SPEC.md "functions/auth/login.js").
// TODO: generate state, set oauth_state cookie, 302 to Asana authorize URL.

export async function onRequestGet(_context) {
  return new Response('Not implemented', { status: 501 });
}
