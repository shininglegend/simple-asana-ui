const PALETTE = ['#c15f3c', '#4f7a6a', '#6a5aa0', '#b08a2e', '#3c7ec1', '#a04f7a'];

export function assignProjectColors(projects) {
  const map = new Map();
  projects.forEach((project, i) => map.set(project.gid, PALETTE[i % PALETTE.length]));
  return map;
}

export function colorForName(name) {
  if (!name) return '#8a857c';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export const STATUS_OPTION_STYLES = {
  'UNKNOWN - PLEASE CHANGE': { bg: '#fed7aa', text: '#7c2d12', border: '#f97316' },
  'Postponed Idea': { bg: '#fbcfe8', text: '#9d174d', border: '#ec4899' },
  'Waiting for Jim': { bg: '#fecaca', text: '#991b1b', border: '#ef4444' },
  'Waiting for response': { bg: '#ccfbf1', text: '#115e59', border: '#99f6e4' },
  'Not started, blocked': { bg: '#374151', text: '#ffffff', border: '#4b5563' },
  'Ready to be start': { bg: '#e5e7eb', text: '#374151', border: '#9ca3af' },
  'In Progress, facing delays': { bg: '#fef08a', text: '#854d0e', border: '#eab308' },
  'In Progress, on schedule': { bg: '#bbf7d0', text: '#166534', border: '#22c55e' },
  Completed: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
  Canceled: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
};

export const ASANA_COLOR_MAP = {
  orange: { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' },
  pink: { bg: '#fce7f3', text: '#9d174d', border: '#fbcfe8' },
  red: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  teal: { bg: '#ccfbf1', text: '#115e59', border: '#99f6e4' },
  'dark-gray': { bg: '#374151', text: '#ffffff', border: '#4b5563' },
  'light-gray': { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
  yellow: { bg: '#fef9c3', text: '#854d0e', border: '#fef08a' },
  'yellow-green': { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  green: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
  purple: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
};

// Status option names may carry a leading sort-order prefix like "3 " that
// isn't part of the status's identity (it exists only to control sort order).
// Strip it before any lookup so renumbering statuses never breaks styling.
const STATUS_PREFIX = /^\d+\s+/;

export function stripStatusPrefix(name) {
  return name ? name.replace(STATUS_PREFIX, '') : name;
}

export function getStatusStyle(optionName, optionColor) {
  const key = stripStatusPrefix(optionName);
  if (STATUS_OPTION_STYLES[key]) {
    return STATUS_OPTION_STYLES[key];
  }
  const color = optionColor || 'cool-gray';
  const mapped = ASANA_COLOR_MAP[color];
  if (mapped) return mapped;
  return { bg: '#f3f4f6', text: '#1f2937', border: '#e5e7eb' };
}

export const PRIORITY_STYLES = {
  Priority: { bg: '#facfcf', text: '#991b1b', border: '#fba6a6' },
  'Low Priority': { bg: '#c0e3fb', text: '#0369a1', border: '#9bd7f7' }, // soft blue
  'Long Term': { bg: '#e0c7fa', text: '#6b21a8', border: '#dbbdfb' }, // soft purple
  Done: { bg: '#f4f6f3', text: '#374151', border: '#e5e7eb' }, // soft gray
};

export function getPriorityStyle(priorityName) {
  return PRIORITY_STYLES[priorityName] || PRIORITY_STYLES['Low Priority'];
}

export function getPriorityBgClass(priority) {
  switch (priority) {
    case 'Priority':
      return 'bg-red-50/80! hover:bg-red-100/80!';
    case 'Low Priority':
      return 'bg-sky-50/70! hover:bg-sky-100/70!';
    case 'Long Term':
      return 'bg-purple-50/70! hover:bg-purple-100/70!';
    case 'Done':
      return 'bg-slate-100/80! hover:bg-slate-200/80!';
    default:
      return 'bg-transparent hover:bg-[#faf8f4]!';
  }
}
