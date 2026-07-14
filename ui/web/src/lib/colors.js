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
