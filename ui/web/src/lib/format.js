const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Person display helper: show only the first name (or first token, e.g. an
// email local part). Returns undefined for a missing name so callers can
// fall back to their own placeholder.
export function firstName(fullName) {
  return fullName?.split(' ')[0];
}

export function formatDateShort(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function formatDateLong(iso) {
  if (!iso) return 'No date';
  const d = new Date(`${iso}T00:00:00`);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function isOverdue(iso, done) {
  if (!iso || done) return false;
  // Compare in local time — due dates render in local time too.
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  return iso < today;
}
