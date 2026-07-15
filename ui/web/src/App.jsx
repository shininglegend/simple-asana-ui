import { useEffect, useMemo, useState } from 'react';
import FilterGroup from './components/FilterGroup.jsx';
import MultiFilterGroup from './components/MultiFilterGroup.jsx';
import TaskRow from './components/TaskRow.jsx';
import TaskDetailModal from './components/TaskDetailModal.jsx';
import { assignProjectColors, STATUS_OPTION_STYLES, stripStatusPrefix } from './lib/colors.js';
import { useIsMobile } from './lib/useIsMobile.js';
import { usePersistentState } from './lib/usePersistentState.js';
import { taskMatchesFilters, NO_STATUS } from './lib/filterTasks.js';
import {
  getMe,
  getProjects,
  getWorkspaceUsers,
  getTasksForProjects,
  setTaskCompleted,
  setTaskNotes,
  setTaskDueDate,
  setTaskAssignee,
  setTaskName,
  createTask,
  getMyTasks,
  addTaskProject,
  removeTaskProject,
  setTaskCustomField,
  deleteTask,
  getTask,
} from './lib/api.js';

const STATUS_OPTIONS = ['Incomplete', 'Complete', 'All'];

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

const getSortLabel = (val, order) => {
  switch (val) {
    case 'created':
      return order === 'asc' ? 'Oldest' : 'Newest';
    case 'due':
      return 'Due date';
    case 'status':
      return 'Status';
    case 'name':
      return order === 'asc' ? 'A-Z' : 'Z-A';
    default:
      return order === 'asc' ? 'Oldest' : 'Newest';
  }
};

export default function App() {
  const [workspaceGid, setWorkspaceGid] = useState(null);
  const [projects, setProjects] = useState([]);
  const [people, setPeople] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [writeError, setWriteError] = useState(null);

  const [status, setStatus] = usePersistentState('asana_filter_status', 'Incomplete', {
    raw: true,
  });
  const [selectedProjects, setSelectedProjects] = usePersistentState('asana_filter_projects', null);
  const [selectedPeople, setSelectedPeople] = usePersistentState('asana_filter_people', null);
  const [selectedCustomStatuses, setSelectedCustomStatuses] = usePersistentState(
    'asana_filter_custom_statuses',
    null,
  );
  const [query, setQuery] = usePersistentState('asana_filter_query', '', { raw: true });
  const [sortBy, setSortBy] = usePersistentState('asana_filter_sortBy', 'created', { raw: true });
  const [sortOrder, setSortOrder] = usePersistentState('asana_filter_sortOrder', 'desc', {
    raw: true,
  });
  const [newTitle, setNewTitle] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newDueDate, setNewDueDate] = useState(defaultDueDate);
  const [newAssignee, setNewAssignee] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedId, setSelectedId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('task') || null;
    } catch {
      return null;
    }
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [loadingSelectedTask, setLoadingSelectedTask] = useState(false);

  const handleSelectId = (id) => {
    setSelectedId(id);
    try {
      const url = new URL(window.location.href);
      if (id) {
        url.searchParams.set('task', id);
      } else {
        url.searchParams.delete('task');
      }
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      console.error('Error updating URL search params:', e);
    }
  };

  const [filtersOpen, setFiltersOpen] = usePersistentState('asana_filters_open', false);

  const isMobile = useIsMobile();

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        const wsGid = me.workspaces?.[0]?.gid;
        if (!wsGid) throw new Error('No workspace found for this user.');
        setWorkspaceGid(wsGid);
        const [projectList, userList] = await Promise.all([
          getProjects(wsGid, me.gid),
          getWorkspaceUsers(wsGid),
        ]);
        setProjects(projectList);
        setPeople(userList);
        const [projectTasks, myTasks] = await Promise.all([
          getTasksForProjects(projectList.map((p) => p.gid)),
          getMyTasks(wsGid, me.gid),
        ]);
        const byGid = new Map();
        projectTasks.forEach((t) => byGid.set(t.gid, t));
        myTasks.forEach((t) => byGid.set(t.gid, t));
        setTasks(Array.from(byGid.values()));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!writeError) return undefined;
    const timer = setTimeout(() => setWriteError(null), 5000);
    return () => clearTimeout(timer);
  }, [writeError]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedTask(null);
      setLoadingSelectedTask(false);
      return;
    }

    const localTask = tasks.find((t) => t.gid === selectedId);
    if (localTask) {
      setSelectedTask(localTask);
    } else {
      setSelectedTask(null);
    }

    setLoadingSelectedTask(true);
    getTask(selectedId)
      .then((fetchedTask) => {
        setSelectedTask(fetchedTask);
        setTasks((ts) => ts.map((t) => (t.gid === fetchedTask.gid ? { ...t, ...fetchedTask } : t)));
      })
      .catch((err) => {
        console.error('Error fetching task details:', err);
        if (!localTask) {
          setWriteError('Could not load task details.');
          setSelectedId(null);
        }
      })
      .finally(() => {
        setLoadingSelectedTask(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const projectColors = useMemo(() => assignProjectColors(projects), [projects]);
  const projectByName = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => map.set(p.name, p));
    return map;
  }, [projects]);

  const globalStatusField = useMemo(() => {
    for (const t of tasks) {
      const f = t.custom_fields?.find((field) => field.name?.toLowerCase() === 'status');
      if (f) return f;
    }
    return null;
  }, [tasks]);

  // Status filter chips: use the live Asana option names (which carry the
  // sort-order prefixes) so the chips match tasks' enum_value.name exactly.
  // Fall back to the styled names only when no status field is present.
  const customStatusOptions = useMemo(() => {
    const names =
      globalStatusField?.enum_options?.map((o) => o.name) ?? Object.keys(STATUS_OPTION_STYLES);
    return [...names, NO_STATUS];
  }, [globalStatusField]);

  const filtered = useMemo(() => {
    const out = tasks.filter((t) =>
      taskMatchesFilters(t, {
        query,
        status,
        selectedProjects,
        selectedPeople,
        selectedCustomStatuses,
      }),
    );
    const near = '0000-00-00';
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    out.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'created') {
        comparison = (a.created_at ?? '').localeCompare(b.created_at ?? '');
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'project') {
        comparison = (a.projects?.[0]?.name ?? '').localeCompare(b.projects?.[0]?.name ?? '');
      } else if (sortBy === 'assignee') {
        comparison = (a.assignee?.name ?? '').localeCompare(b.assignee?.name ?? '');
      } else if (sortBy === 'status') {
        const aStatus =
          a.custom_fields?.find((f) => f.name?.toLowerCase() === 'status')?.enum_value?.name ?? '';
        const bStatus =
          b.custom_fields?.find((f) => f.name?.toLowerCase() === 'status')?.enum_value?.name ?? '';
        comparison = aStatus.localeCompare(bStatus);
      } else if (sortBy === 'due') {
        comparison = (a.due_on ?? near).localeCompare(b.due_on ?? near);
      } else {
        comparison = (a.due_on ?? near).localeCompare(b.due_on ?? near);
      }

      // Apply primary sort order multiplier
      const primaryResult = comparison * multiplier;
      if (primaryResult !== 0) {
        return primaryResult;
      }

      // Secondary tiebreaker: due date (sooner = higher / earlier date first),
      // but only if the primary sort isn't already showing it (i.e. sortBy !== 'due')
      if (sortBy !== 'due') {
        const secondaryComparison = (a.due_on ?? near).localeCompare(b.due_on ?? near);
        if (secondaryComparison !== 0) {
          return secondaryComparison;
        }
      }

      // Tertiary tiebreaker: A-Z (name ascending)
      return a.name.localeCompare(b.name);
    });
    return out;
  }, [
    tasks,
    query,
    status,
    selectedProjects,
    selectedPeople,
    selectedCustomStatuses,
    sortBy,
    sortOrder,
  ]);

  function updateTaskLocal(gid, patch) {
    setTasks((ts) => ts.map((t) => (t.gid === gid ? { ...t, ...patch } : t)));
    setSelectedTask((curr) => (curr && curr.gid === gid ? { ...curr, ...patch } : curr));
  }

  // Apply `patch` optimistically, call the API, and roll the patched fields
  // back to their prior values (surfacing `errorMsg`) if the write fails.
  async function optimisticUpdate(gid, patch, apiCall, errorMsg) {
    const prev = tasks.find((t) => t.gid === gid);
    if (!prev) return;
    const rollback = {};
    for (const key of Object.keys(patch)) rollback[key] = prev[key];
    updateTaskLocal(gid, patch);
    try {
      await apiCall();
    } catch {
      updateTaskLocal(gid, rollback);
      setWriteError(errorMsg);
    }
  }

  function toggleProject(name) {
    setSelectedProjects((prev) => {
      if (prev === null) return projects.map((p) => p.name).filter((n) => n !== name);
      return prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
    });
  }

  function togglePerson(name) {
    setSelectedPeople((prev) => {
      if (prev === null)
        return [...people.map((p) => p.name), 'Unassigned'].filter((n) => n !== name);
      return prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
    });
  }

  function toggleCustomStatus(name) {
    setSelectedCustomStatuses((prev) => {
      if (prev === null) {
        return customStatusOptions.filter((n) => n !== name);
      }
      return prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
    });
  }

  function handleSort(field) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'created' ? 'desc' : 'asc');
    }
  }

  const renderHeader = (label, field) => {
    const isSelected = sortBy === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className={`group flex items-center gap-1 font-semibold text-[11px] tracking-wider uppercase transition-colors cursor-pointer select-none border-0 bg-transparent p-0 ${
          isSelected ? 'text-ink' : 'text-fainter hover:text-ink'
        }`}
      >
        <span>{label}</span>
        <span
          className={`text-[9px] transition-all duration-200 ${
            isSelected
              ? 'text-accent opacity-100 font-bold'
              : 'text-fainter opacity-0 group-hover:opacity-50'
          }`}
        >
          {isSelected ? (sortOrder === 'asc' ? '↑' : '↓') : '↑'}
        </span>
      </button>
    );
  };

  async function handleToggle(gid, completed) {
    await optimisticUpdate(
      gid,
      { completed },
      () => setTaskCompleted(gid, completed),
      "Couldn't update the task in Asana.",
    );
  }

  async function handleNameChange(gid, name) {
    await optimisticUpdate(
      gid,
      { name },
      () => setTaskName(gid, name),
      "Couldn't save the task name in Asana.",
    );
  }

  async function handleNotesChange(gid, notes) {
    await optimisticUpdate(
      gid,
      { notes },
      () => setTaskNotes(gid, notes),
      "Couldn't save the description in Asana.",
    );
  }

  async function handleDueChange(gid, dueOn) {
    await optimisticUpdate(
      gid,
      { due_on: dueOn },
      () => setTaskDueDate(gid, dueOn),
      "Couldn't save the due date in Asana.",
    );
  }

  async function handleAssigneeChange(gid, assigneeGid) {
    const newAssignee = assigneeGid ? people.find((p) => p.gid === assigneeGid) : null;
    await optimisticUpdate(
      gid,
      { assignee: newAssignee },
      () => setTaskAssignee(gid, assigneeGid),
      "Couldn't save the assignee in Asana.",
    );
  }

  async function handleCustomFieldChange(taskGid, customFieldGid, enumOptionGid) {
    const task = tasks.find((t) => t.gid === taskGid);
    if (!task) return;
    const prevCustomFields = task.custom_fields ?? [];

    const hasField = prevCustomFields.some((f) => f.gid === customFieldGid);
    let newCustomFields;
    if (hasField) {
      newCustomFields = prevCustomFields.map((f) => {
        if (f.gid === customFieldGid) {
          const enum_value = enumOptionGid
            ? f.enum_options?.find((opt) => opt.gid === enumOptionGid) || null
            : null;
          return { ...f, enum_value, display_value: enum_value ? enum_value.name : '' };
        }
        return f;
      });
    } else {
      const templateField = globalStatusField;
      if (templateField) {
        const enum_value = enumOptionGid
          ? templateField.enum_options?.find((opt) => opt.gid === enumOptionGid) || null
          : null;
        newCustomFields = [
          ...prevCustomFields,
          {
            ...templateField,
            enum_value,
            display_value: enum_value ? enum_value.name : '',
          },
        ];
      } else {
        newCustomFields = prevCustomFields;
      }
    }

    updateTaskLocal(taskGid, { custom_fields: newCustomFields });
    try {
      await setTaskCustomField(taskGid, customFieldGid, enumOptionGid);
    } catch {
      updateTaskLocal(taskGid, { custom_fields: prevCustomFields });
      setWriteError("Couldn't update the status in Asana.");
    }
  }

  async function handleAddProject(taskGid, projectGid) {
    const task = tasks.find((t) => t.gid === taskGid);
    if (!task) return;
    const project = projects.find((p) => p.gid === projectGid);
    if (!project) return;
    const prevProjects = task.projects ?? [];
    if (prevProjects.some((p) => p.gid === projectGid)) return;

    const newProjects = [...prevProjects, project];
    updateTaskLocal(taskGid, { projects: newProjects });
    try {
      await addTaskProject(taskGid, projectGid);
    } catch {
      updateTaskLocal(taskGid, { projects: prevProjects });
      setWriteError("Couldn't add the project to the task in Asana.");
    }
  }

  async function handleRemoveProject(taskGid, projectGid) {
    const task = tasks.find((t) => t.gid === taskGid);
    if (!task) return;
    const prevProjects = task.projects ?? [];
    if (prevProjects.length <= 1) return;

    const newProjects = prevProjects.filter((p) => p.gid !== projectGid);
    updateTaskLocal(taskGid, { projects: newProjects });
    try {
      await removeTaskProject(taskGid, projectGid);
    } catch {
      updateTaskLocal(taskGid, { projects: prevProjects });
      setWriteError("Couldn't remove the project from the task in Asana.");
    }
  }

  async function handleDeleteTask(gid) {
    const prev = tasks;
    setTasks((ts) => ts.filter((t) => t.gid !== gid));
    handleSelectId(null);
    try {
      await deleteTask(gid);
    } catch {
      setTasks(prev);
      setWriteError("Couldn't delete the task in Asana.");
    }
  }

  async function handleAddTask() {
    if (projects.length === 0) {
      setWriteError('Cannot create a task because there are no projects in the workspace.');
      return;
    }
    const title = newTitle.trim();
    if (!title || !workspaceGid) return;
    const targetProject = projects.find((p) => p.gid === newProject);
    if (!targetProject) {
      setWriteError('Please select a project.');
      return;
    }
    const assigneeGid = newAssignee || null;
    if (!assigneeGid) {
      setWriteError('Please select an assignee.');
      return;
    }
    const dueOn = newDueDate || null;
    if (!dueOn) {
      setWriteError('Please select a due date.');
      return;
    }
    // Build custom_fields to set status to UNKNOWN
    const unknownOption = globalStatusField?.enum_options?.find(
      (opt) => stripStatusPrefix(opt.name) === 'UNKNOWN - PLEASE CHANGE',
    );
    const customFields =
      globalStatusField && unknownOption
        ? { [globalStatusField.gid]: unknownOption.gid }
        : undefined;
    setNewTitle('');
    setShowAddForm(false);
    try {
      const created = await createTask({
        name: title,
        workspaceGid,
        projectGid: targetProject.gid,
        assigneeGid,
        dueOn,
        customFields,
      });
      const assigneePerson = people.find((p) => p.gid === assigneeGid);
      // Build local custom_fields representation for the new task
      let localCustomFields = created.custom_fields ?? [];
      if (
        globalStatusField &&
        unknownOption &&
        !localCustomFields.some((f) => f.gid === globalStatusField.gid)
      ) {
        localCustomFields = [
          ...localCustomFields,
          {
            ...globalStatusField,
            enum_value: unknownOption,
            display_value: unknownOption.name,
          },
        ];
      }
      const taskObject = {
        ...created,
        created_at: created.created_at || new Date().toISOString(),
        due_on: dueOn,
        projects: [targetProject],
        assignee: assigneePerson || null,
        custom_fields: localCustomFields,
      };
      setTasks((ts) => [taskObject, ...ts]);

      // Warn if the newly created task is hidden by the current filters.
      const isHidden = !taskMatchesFilters(taskObject, {
        query,
        status,
        selectedProjects,
        selectedPeople,
        selectedCustomStatuses,
      });

      if (isHidden) {
        setWriteError({
          type: 'warning',
          message: (
            <span className="flex items-center gap-2">
              Task is hidden by current filters.
              <button
                type="button"
                onClick={() => {
                  setStatus('Incomplete');
                  setSelectedProjects(null);
                  setSelectedPeople(null);
                  setSelectedCustomStatuses(null);
                  setQuery('');
                  setWriteError(null);
                }}
                className="underline font-bold hover:opacity-80 cursor-pointer ml-1"
              >
                Clear filters
              </button>
            </span>
          ),
        });
      }
    } catch {
      setNewTitle(title);
      setWriteError("Couldn't create the task in Asana.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-panel flex items-center justify-center text-muted">
        Loading your tasks…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-panel flex flex-col items-center justify-center gap-3 text-ink px-5 text-center">
        <p>{error}</p>
        <a href="/auth/login" className="font-semibold">
          Try logging in again
        </a>
      </div>
    );
  }

  const activeFilterCount =
    (status !== 'Incomplete' ? 1 : 0) +
    (selectedProjects !== null ? 1 : 0) +
    (selectedPeople !== null ? 1 : 0) +
    (selectedCustomStatuses !== null ? 1 : 0);
  const countLabel = `${filtered.length} ${filtered.length === 1 ? 'task' : 'tasks'} in this view`;

  const isObjectToast = writeError && typeof writeError === 'object' && 'message' in writeError;
  const toastMsg = isObjectToast ? writeError.message : writeError;
  const toastType = isObjectToast ? writeError.type : 'error';

  const filterGroups = (
    <>
      <div className="flex flex-col gap-4">
        <FilterGroup
          label="Show"
          options={STATUS_OPTIONS}
          value={status}
          variant="status"
          onSelect={setStatus}
        />
      </div>
      <MultiFilterGroup
        label="Project"
        options={projects.map((p) => ({
          name: p.name,
          color: projectColors.get(p.gid),
        }))}
        selected={selectedProjects}
        onToggle={toggleProject}
        onSelectAll={() => setSelectedProjects(null)}
        onSelectNone={() => setSelectedProjects([])}
      />
      <MultiFilterGroup
        label="Who"
        options={[...people.map((p) => p.name), 'Unassigned']}
        selected={selectedPeople}
        onToggle={togglePerson}
        onSelectAll={() => setSelectedPeople(null)}
        onSelectNone={() => setSelectedPeople([])}
      />
      <MultiFilterGroup
        label="Status"
        options={customStatusOptions}
        selected={selectedCustomStatuses}
        onToggle={toggleCustomStatus}
        onSelectAll={() => setSelectedCustomStatuses(null)}
        onSelectNone={() => setSelectedCustomStatuses([])}
      />
    </>
  );

  return (
    <div className="min-h-screen bg-panel py-6 px-3 md:px-8">
      <div className="max-w-6xl mx-auto flex flex-col md:grid md:grid-cols-[350px_1fr] gap-6 items-start">
        {/* Card A: Top Bar */}
        <div className="bg-white rounded-xl shadow-xs border border-border-soft p-4 md:p-6 flex flex-col gap-4 md:col-span-2 md:col-start-1 md:row-start-1 w-full">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="m-0 font-bold text-[17px] md:text-[22px] text-ink tracking-tight">
              Inner Excellence Tasks
            </h1>
            <div className="flex items-center gap-4">
              <span className="hidden md:inline font-semibold text-[13px] text-faint">
                {countLabel}
              </span>
              <a
                href="/auth/logout"
                className="font-semibold text-[13px] text-muted hover:text-ink"
              >
                Log out
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-panel border-[1.5px] border-border rounded-[10px] px-3.5 py-2">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a8a196"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
              className="flex-1 min-w-0 border-0 outline-none bg-transparent font-medium text-sm text-ink"
            />
          </div>

          {/* Mobile Filter Toggle & Sort Row */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-[13px] border-[1.5px] bg-panel border-border text-ink-soft hover:bg-panel-alt transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="10" y1="18" x2="14" y2="18" />
              </svg>
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="min-w-4 h-4 px-1 box-border rounded-lg bg-accent text-white font-bold text-[10px] leading-4 text-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="relative">
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-[13px] border-[1.5px] bg-panel border-border text-ink-soft">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 20V4M3 8l4-4 4 4M17 4v16m-4-4 4 4 4-4" />
                </svg>
                <span>Sort: {getSortLabel(sortBy, sortOrder)}</span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => {
                  const newSortBy = e.target.value;
                  setSortBy(newSortBy);
                  setSortOrder(newSortBy === 'created' ? 'desc' : 'asc');
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer font-sans"
              >
                <option value="created">{sortOrder === 'asc' ? 'Oldest' : 'Newest'}</option>
                <option value="due">Due date</option>
                <option value="status">Status</option>
                <option value="name">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="flex items-center justify-center rounded-full w-8 h-8 font-semibold border-[1.5px] bg-panel border-border text-ink-soft hover:bg-panel-alt transition-colors cursor-pointer"
              aria-label={`Toggle sort order to ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'asc' ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Card B: Filters Panel */}
        <div
          className={`${
            filtersOpen ? 'flex' : 'hidden'
          } md:flex flex-col gap-4 bg-white rounded-xl shadow-xs border border-border-soft p-4 md:p-6 md:col-start-1 md:row-start-2 md:sticky md:top-6 w-full`}
        >
          {filterGroups}
        </div>

        {/* Card C: Task List */}
        <div className="bg-white rounded-xl shadow-xs border border-border-soft overflow-hidden md:col-start-2 md:row-start-2 w-full">
          {/* Desktop Table Headers */}
          <div className="hidden md:flex items-center gap-4 px-6 pt-4 pb-3 border-b border-border-soft font-semibold text-[11px] tracking-wider uppercase text-fainter bg-slate-50/10">
            <span className="text-muted/60">Sort by:</span>
            {renderHeader('Task Name', 'name')}
            <span className="text-border-soft">•</span>
            {renderHeader('Due Date', 'due')}
            <span className="text-border-soft">•</span>
            {renderHeader('Status', 'status')}
            <span className="text-border-soft">•</span>
            {renderHeader(
              sortBy === 'created' ? (sortOrder === 'desc' ? 'Newest' : 'Oldest') : 'Newest',
              'created',
            )}
          </div>

          <div className="flex-1 overflow-auto px-2 md:px-6 py-1.5">
            <div className="md:hidden pt-2.5 pb-1 px-0.5 font-semibold text-[11px] tracking-wider uppercase text-fainter">
              {countLabel}
            </div>

            {!showAddForm ? (
              <button
                type="button"
                onClick={() => {
                  const inboxProj = projects.find(
                    (p) =>
                      p.name.toLowerCase() === '.task inbox' || p.name.toLowerCase() === 'inbox',
                  );
                  setNewProject(
                    selectedProjects && selectedProjects.length === 1
                      ? projectByName.get(selectedProjects[0])?.gid || ''
                      : inboxProj?.gid || projects[0]?.gid || '',
                  );
                  setNewAssignee(
                    selectedPeople &&
                      selectedPeople.length === 1 &&
                      selectedPeople[0] !== 'Unassigned'
                      ? people.find((p) => p.name === selectedPeople[0])?.gid || ''
                      : '',
                  );
                  setNewDueDate(defaultDueDate());
                  setShowAddForm(true);
                }}
                className="flex items-center gap-3 my-3 px-3.5 py-3 bg-panel border-[1.5px] border-border rounded-xl shadow-[0_1px_2px_rgba(60,50,35,0.05)] w-full text-left cursor-pointer hover:opacity-80"
              >
                <span className="w-[26px] h-[26px] flex-none rounded-full bg-accent flex items-center justify-center text-white text-lg font-semibold leading-none">
                  +
                </span>
                <span className="text-muted font-medium text-[15px]">Add a task…</span>
              </button>
            ) : (
              <div className="my-3 px-3.5 py-3 bg-panel border-[1.5px] border-border rounded-xl shadow-[0_1px_2px_rgba(60,50,35,0.05)]">
                <div className="flex items-center gap-3">
                  <span className="w-[26px] h-[26px] flex-none rounded-full bg-accent flex items-center justify-center text-white text-lg font-semibold leading-none">
                    +
                  </span>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    placeholder="Task name…"
                    autoFocus
                    className="flex-1 min-w-0 border-0 outline-none bg-transparent font-semibold text-[15px] text-ink"
                  />
                </div>
                <div
                  className={`flex flex-wrap items-center gap-2 mt-2.5 ${isMobile ? '' : 'ml-[38px]'}`}
                >
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="text-[13px] px-2 py-1.5 rounded-lg border border-border bg-panel text-ink font-medium outline-none cursor-pointer"
                  >
                    <option value="">Assignee…</option>
                    {people.map((p) => (
                      <option key={p.gid} value={p.gid}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newProject}
                    onChange={(e) => setNewProject(e.target.value)}
                    className="text-[13px] px-2 py-1.5 rounded-lg border border-border bg-panel text-ink font-medium outline-none cursor-pointer"
                  >
                    <option value="">Project…</option>
                    {projects.map((p) => (
                      <option key={p.gid} value={p.gid}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="text-[13px] px-2 py-1.5 rounded-lg border border-border bg-panel text-ink font-medium outline-none cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={handleAddTask}
                    disabled={!newTitle.trim() || !newProject || !newAssignee || !newDueDate}
                    className="text-[13px] px-3 py-1.5 rounded-lg bg-accent text-white font-semibold hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewTitle('');
                    }}
                    className="text-[13px] px-2 py-1.5 text-muted hover:text-ink font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {filtered.map((t) => (
              <div key={t.gid}>
                <TaskRow
                  task={t}
                  projectColors={projectColors}
                  onToggle={handleToggle}
                  onOpen={handleSelectId}
                  isMobile={isMobile}
                />
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-11 px-2.5 text-center text-fainter font-medium text-[15px] leading-snug">
                Nothing here with these filters.
              </div>
            )}
          </div>
        </div>
      </div>

      {toastMsg && (
        <div
          className={`fixed bottom-[calc(env(safe-area-inset-bottom)+20px)] left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] ${toastType === 'warning' ? 'bg-[#fbbf24] text-[#1c1917]' : 'bg-danger text-white'} font-semibold text-[14px] px-5 py-3 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.2)] flex items-center gap-2 whitespace-nowrap`}
        >
          {toastMsg}
        </div>
      )}

      {selectedId && (
        <TaskDetailModal
          task={selectedTask}
          isLoading={loadingSelectedTask}
          projectColors={projectColors}
          projects={projects}
          onAddProject={handleAddProject}
          onRemoveProject={handleRemoveProject}
          onClose={() => handleSelectId(null)}
          onToggle={handleToggle}
          onNotesChange={handleNotesChange}
          onNameChange={handleNameChange}
          onDueChange={handleDueChange}
          onAssigneeChange={handleAssigneeChange}
          onCustomFieldChange={handleCustomFieldChange}
          onDelete={handleDeleteTask}
          onOpenTask={handleSelectId}
          globalStatusField={globalStatusField}
          people={people}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
