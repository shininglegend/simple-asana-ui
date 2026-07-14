// Sentinel used by the Status filter for tasks that have no status set.
// Kept distinct from MultiFilterGroup's built-in "None" (select-none) control
// so the two don't render as identical pills.
export const NO_STATUS = 'No status';

// Single source of truth for whether a task is visible under the active
// filters. Used both to build the list view and to decide whether a
// freshly-created task would be hidden.
export function taskMatchesFilters(
  task,
  { query, status, selectedProjects, selectedPeople, selectedCustomStatuses },
) {
  const q = query.trim().toLowerCase();
  if (q && !task.name.toLowerCase().includes(q)) return false;
  if (status === 'Incomplete' && task.completed) return false;
  if (status === 'Complete' && !task.completed) return false;
  if (selectedProjects !== null) {
    const names = task.projects?.map((p) => p.name) ?? [];
    if (!names.some((n) => selectedProjects.includes(n))) return false;
  }
  if (selectedPeople !== null) {
    const assigneeName = task.assignee ? task.assignee.name : 'Unassigned';
    if (!selectedPeople.includes(assigneeName)) return false;
  }
  if (selectedCustomStatuses !== null) {
    const taskStatus =
      task.custom_fields?.find((f) => f.name?.toLowerCase() === 'status')?.enum_value?.name ??
      NO_STATUS;
    if (!selectedCustomStatuses.includes(taskStatus)) return false;
  }
  return true;
}
