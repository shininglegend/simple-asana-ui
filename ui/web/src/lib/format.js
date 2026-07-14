const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  const today = new Date().toISOString().slice(0, 10);
  return iso < today;
}
