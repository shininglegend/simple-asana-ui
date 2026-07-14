// ALL /api/asana/* catch-all proxy (see BUILD_SPEC.md "functions/api/asana/[[path]].js").
// TODO: forward to https://app.asana.com/api/1.0/ with Bearer token from cookie,
// refresh-on-401 and retry once, return 401 (not 500) when unauthenticated.

export async function onRequest(_context) {
  return new Response(JSON.stringify({ error: 'Not implemented' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
}
