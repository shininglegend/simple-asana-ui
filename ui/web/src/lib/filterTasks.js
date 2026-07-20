// Sentinel used by the Status filter for tasks that have no status set.
// Kept distinct from MultiFilterGroup's built-in "None" (select-none) control
// so the two don't render as identical pills.
export const NO_STATUS = 'No status';

// Sentinel used by the Project filter for tasks that don't belong to any
// visible project (e.g. tasks pulled in via "my tasks" that aren't in a
// project the user is a member of).
export const NO_PROJECT = 'No project';

export const PRIORITY_OPTIONS = ['Priority', 'Low Priority', 'Long Term', 'Done'];

export function getTaskPriority(task) {
  if (task && task.memberships && Array.isArray(task.memberships)) {
    for (const m of task.memberships) {
      const secName = m.section?.name;
      if (secName && PRIORITY_OPTIONS.includes(secName)) {
        return secName;
      }
    }
  }
  return task?.completed ? 'Done' : 'Low Priority';
}

// Single source of truth for whether a task is visible under the active
// filters. Used both to build the list view and to decide whether a
// freshly-created task would be hidden.
export function taskMatchesFilters(
  task,
  { query, status, selectedProjects, selectedPeople, selectedCustomStatuses, selectedPriorities },
) {
  const q = query.trim().toLowerCase();
  if (q) {
    const nameMatch = (task.name || '').toLowerCase().includes(q);
    const notesMatch = (task.notes || '').toLowerCase().includes(q);
    const commentsMatch = task.comments?.some((c) => (c.text || '').toLowerCase().includes(q));
    if (!nameMatch && !notesMatch && !commentsMatch) return false;
  }
  if (status === 'Incomplete' && task.completed) return false;
  if (status === 'Complete' && !task.completed) return false;
  if (selectedProjects !== null) {
    const names = task.projects?.map((p) => p.name) ?? [];
    const projectNames = names.length ? names : [NO_PROJECT];
    if (!projectNames.some((n) => selectedProjects.includes(n))) return false;
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
  if (selectedPriorities !== null) {
    const priority = getTaskPriority(task);
    if (!selectedPriorities.includes(priority)) return false;
  }
  return true;
}
