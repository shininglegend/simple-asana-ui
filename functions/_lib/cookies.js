// Shared cookie + token helpers (see BUILD_SPEC.md "functions/_lib/cookies.js").
// TODO: implement parseCookies, serializeCookie, clearCookie, refreshAccessToken.

export function parseCookies(_request) {
  throw new Error('not implemented');
}

export function serializeCookie(_name, _value, _opts) {
  throw new Error('not implemented');
}

export function clearCookie(_name) {
  throw new Error('not implemented');
}

export async function refreshAccessToken(_env, _refreshToken) {
  throw new Error('not implemented');
}
