// GET /auth/callback (see BUILD_SPEC.md "functions/auth/callback.js").
// TODO: verify state, exchange code for tokens, enforce workspace gate, set cookies.

export async function onRequestGet(_context) {
  return new Response('Not implemented', { status: 501 });
}
