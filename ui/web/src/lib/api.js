const TASK_FIELDS =
  'name,due_on,completed,notes,created_at,assignee.gid,assignee.name,projects.gid,projects.name';
const STORY_FIELDS = 'text,created_at,created_by.name,resource_subtype';

async function apiFetch(path, options = {}) {
  const res = await fetch(`/api/asana/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (res.status === 401) {
    window.location.href = '/auth/login';
    return new Promise(() => {});
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Asana request failed (${res.status}): ${path} ${body}`);
  }
  const json = await res.json();
  return json.data;
}

export function getMe() {
  return apiFetch('users/me?opt_fields=name,gid,workspaces.gid,workspaces.name');
}

export async function getProjects(workspaceGid, userGid) {
  const allProjects = await apiFetch(
    `projects?workspace=${workspaceGid}&opt_fields=name,gid,members.gid&archived=false`,
  );
  return allProjects.filter((p) => p.members?.some((m) => m.gid === userGid));
}

export function getWorkspaceUsers(workspaceGid) {
  return apiFetch(`workspaces/${workspaceGid}/users?opt_fields=name,gid`);
}

// Asana enforces concurrency/rate limits, so cap the per-project fan-out.
const MAX_CONCURRENT_REQUESTS = 8;

async function mapLimit(items, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(MAX_CONCURRENT_REQUESTS, items.length) }, worker),
  );
  return results;
}

export async function getTasksForProjects(projectGids) {
  const perProject = await mapLimit(projectGids, (gid) =>
    apiFetch(`projects/${gid}/tasks?opt_fields=${TASK_FIELDS}`),
  );
  const byGid = new Map();
  for (const list of perProject) {
    for (const task of list) byGid.set(task.gid, task);
  }
  return Array.from(byGid.values());
}

export function setTaskCompleted(taskGid, completed) {
  return apiFetch(`tasks/${taskGid}`, {
    method: 'PUT',
    body: JSON.stringify({ data: { completed } }),
  });
}

export function setTaskNotes(taskGid, notes) {
  return apiFetch(`tasks/${taskGid}`, {
    method: 'PUT',
    body: JSON.stringify({ data: { notes } }),
  });
}

export function setTaskDueDate(taskGid, dueOn) {
  return apiFetch(`tasks/${taskGid}`, {
    method: 'PUT',
    body: JSON.stringify({ data: { due_on: dueOn } }),
  });
}

export function setTaskAssignee(taskGid, assigneeGid) {
  return apiFetch(`tasks/${taskGid}`, {
    method: 'PUT',
    body: JSON.stringify({ data: { assignee: assigneeGid } }),
  });
}

export function createTask({ name, workspaceGid, projectGid, assigneeGid }) {
  return apiFetch('tasks', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        name,
        workspace: workspaceGid,
        projects: projectGid ? [projectGid] : [],
        assignee: assigneeGid ?? null,
      },
    }),
  });
}

export function getStories(taskGid) {
  return apiFetch(`tasks/${taskGid}/stories?opt_fields=${STORY_FIELDS}`);
}

export function addComment(taskGid, text) {
  return apiFetch(`tasks/${taskGid}/stories`, {
    method: 'POST',
    body: JSON.stringify({ data: { text } }),
  });
}
