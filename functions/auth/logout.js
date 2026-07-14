// GET /auth/logout (see BUILD_SPEC.md "functions/auth/logout.js").
// TODO: clear asana_at, asana_rt, oauth_state cookies; 302 to /.

export async function onRequestGet(_context) {
  return new Response('Not implemented', { status: 501 });
}
