import { useEffect, useMemo, useState } from 'react';
import FilterGroup from './components/FilterGroup.jsx';
import MultiFilterGroup from './components/MultiFilterGroup.jsx';
import TaskRow from './components/TaskRow.jsx';
import TaskDetailModal from './components/TaskDetailModal.jsx';
import { assignProjectColors } from './lib/colors.js';
import { useIsMobile } from './lib/useIsMobile.js';
import {
  getMe,
  getProjects,
  getWorkspaceUsers,
  getTasksForProjects,
  setTaskCompleted,
  setTaskNotes,
  createTask,
} from './lib/api.js';

const STATUS_OPTIONS = ['Incomplete', 'Complete', 'All'];

export default function App() {
  const [workspaceGid, setWorkspaceGid] = useState(null);
  const [projects, setProjects] = useState([]);
  const [people, setPeople] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [writeError, setWriteError] = useState(null);

  const [status, setStatus] = useState(() => {
    try {
      const val = localStorage.getItem('asana_filter_status');
      return val !== null ? val : 'Incomplete';
    } catch {
      return 'Incomplete';
    }
  });
  const [selectedProjects, setSelectedProjects] = useState(() => {
    try {
      const val = localStorage.getItem('asana_filter_projects');
      return val !== null ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  });
  const [selectedPeople, setSelectedPeople] = useState(() => {
    try {
      const val = localStorage.getItem('asana_filter_people');
      return val !== null ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  });
  const [query, setQuery] = useState(() => {
    try {
      const val = localStorage.getItem('asana_filter_query');
      return val !== null ? val : '';
    } catch {
      return '';
    }
  });
  const [sortBy, setSortBy] = useState(() => {
    try {
      const val = localStorage.getItem('asana_filter_sortBy');
      return val !== null ? val : 'created';
    } catch {
      return 'created';
    }
  });
  const [sortOrder, setSortOrder] = useState(() => {
    try {
      const val = localStorage.getItem('asana_filter_sortOrder');
      return val !== null ? val : 'desc';
    } catch {
      return 'desc';
    }
  });
  const [newTitle, setNewTitle] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(() => {
    try {
      const val = localStorage.getItem('asana_filters_open');
      return val !== null ? JSON.parse(val) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('asana_filter_status', status);
    } catch (e) {
      console.error('Error saving status filter:', e);
    }
  }, [status]);

  useEffect(() => {
    try {
      if (selectedProjects === null) {
        localStorage.removeItem('asana_filter_projects');
      } else {
        localStorage.setItem('asana_filter_projects', JSON.stringify(selectedProjects));
      }
    } catch (e) {
      console.error('Error saving projects filter:', e);
    }
  }, [selectedProjects]);

  useEffect(() => {
    try {
      if (selectedPeople === null) {
        localStorage.removeItem('asana_filter_people');
      } else {
        localStorage.setItem('asana_filter_people', JSON.stringify(selectedPeople));
      }
    } catch (e) {
      console.error('Error saving people filter:', e);
    }
  }, [selectedPeople]);

  useEffect(() => {
    try {
      localStorage.setItem('asana_filter_query', query);
    } catch (e) {
      console.error('Error saving query filter:', e);
    }
  }, [query]);

  useEffect(() => {
    try {
      localStorage.setItem('asana_filter_sortBy', sortBy);
    } catch (e) {
      console.error('Error saving sortBy:', e);
    }
  }, [sortBy]);

  useEffect(() => {
    try {
      localStorage.setItem('asana_filter_sortOrder', sortOrder);
    } catch (e) {
      console.error('Error saving sortOrder:', e);
    }
  }, [sortOrder]);

  useEffect(() => {
    try {
      localStorage.setItem('asana_filters_open', JSON.stringify(filtersOpen));
    } catch (e) {
      console.error('Error saving filtersOpen state:', e);
    }
  }, [filtersOpen]);

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
        const taskList = await getTasksForProjects(projectList.map((p) => p.gid));
        setTasks(taskList);
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

  const projectColors = useMemo(() => assignProjectColors(projects), [projects]);
  const projectByName = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => map.set(p.name, p));
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = tasks.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q)) return false;
      if (status === 'Incomplete' && t.completed) return false;
      if (status === 'Complete' && !t.completed) return false;
      if (selectedProjects !== null) {
        const names = t.projects?.map((p) => p.name) ?? [];
        if (!names.some((n) => selectedProjects.includes(n))) return false;
      }
      if (selectedPeople !== null) {
        const assigneeName = t.assignee ? t.assignee.name : 'Unassigned';
        if (!selectedPeople.includes(assigneeName)) return false;
      }
      return true;
    });
    const far = '9999-99-99';
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    out.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'created') {
        comparison = (a.created_at ?? '').localeCompare(b.created_at ?? '');
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'project') {
        comparison = (a.projects?.[0]?.name ?? '').localeCompare(b.projects?.[0]?.name ?? '');
        if (comparison === 0) {
          comparison = (a.due_on ?? far).localeCompare(b.due_on ?? far);
        }
      } else if (sortBy === 'assignee') {
        comparison = (a.assignee?.name ?? '').localeCompare(b.assignee?.name ?? '');
      } else if (sortBy === 'due') {
        comparison = (a.due_on ?? far).localeCompare(b.due_on ?? far);
      } else {
        comparison = (a.due_on ?? far).localeCompare(b.due_on ?? far);
      }
      return comparison * multiplier;
    });
    return out;
  }, [tasks, query, status, selectedProjects, selectedPeople, sortBy, sortOrder]);

  const selected = tasks.find((t) => t.gid === selectedId) ?? null;

  function updateTaskLocal(gid, patch) {
    setTasks((ts) => ts.map((t) => (t.gid === gid ? { ...t, ...patch } : t)));
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
    const prev = tasks.find((t) => t.gid === gid)?.completed;
    updateTaskLocal(gid, { completed });
    try {
      await setTaskCompleted(gid, completed);
    } catch {
      updateTaskLocal(gid, { completed: prev });
      setWriteError("Couldn't update the task in Asana.");
    }
  }

  async function handleNotesChange(gid, notes) {
    const prev = tasks.find((t) => t.gid === gid)?.notes;
    updateTaskLocal(gid, { notes });
    try {
      await setTaskNotes(gid, notes);
    } catch {
      updateTaskLocal(gid, { notes: prev });
      setWriteError("Couldn't save the description in Asana.");
    }
  }

  async function handleAddTask() {
    const title = newTitle.trim();
    if (!title || !workspaceGid) return;
    setNewTitle('');
    const targetProject =
      selectedProjects && selectedProjects.length === 1
        ? projectByName.get(selectedProjects[0])
        : projects[0];
    const singlePerson =
      selectedPeople && selectedPeople.length === 1 && selectedPeople[0] !== 'Unassigned'
        ? selectedPeople[0]
        : null;
    const assigneeGid = singlePerson ? people.find((p) => p.name === singlePerson)?.gid : null;
    try {
      const created = await createTask({
        name: title,
        workspaceGid,
        projectGid: targetProject?.gid,
        assigneeGid,
      });
      setTasks((ts) => [
        {
          ...created,
          created_at: created.created_at || new Date().toISOString(),
          projects: targetProject ? [targetProject] : [],
          assignee: assigneeGid ? people.find((p) => p.gid === assigneeGid) : null,
        },
        ...ts,
      ]);
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
    (selectedPeople !== null ? 1 : 0);
  const countLabel = `${filtered.length} ${filtered.length === 1 ? 'task' : 'tasks'}`;

  const filterGroups = (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 md:gap-2">
        <FilterGroup
          label="Show"
          options={STATUS_OPTIONS}
          value={status}
          variant="status"
          onSelect={setStatus}
        />
        <div className="hidden md:flex items-center gap-2">
          <span className="font-semibold text-[11px] tracking-wider uppercase text-fainter">
            Sort
          </span>
          <select
            value={sortBy}
            onChange={(e) => {
              const newSortBy = e.target.value;
              setSortBy(newSortBy);
              setSortOrder(newSortBy === 'created' ? 'desc' : 'asc');
            }}
            className="appearance-none border-[1.5px] border-border bg-panel rounded-full pl-3.5 pr-7 py-2 font-semibold text-[13px] text-ink cursor-pointer"
          >
            <option value="created">Newest</option>
            <option value="due">Due date</option>
            <option value="project">Project</option>
            <option value="name">Name</option>
            <option value="assignee">Who</option>
          </select>
        </div>
      </div>
      <MultiFilterGroup
        label="Project"
        options={projects.map((p) => p.name)}
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
    </>
  );

  return (
    <div className="min-h-screen bg-panel">
      
        <div className="sticky top-0 z-[5] bg-panel-alt border-b border-border px-4 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] md:px-6 md:py-5.5 flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="m-0 font-bold text-[17px] md:text-[22px] text-ink tracking-tight">
              Tasks
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

          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className={`md:hidden flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-[13px] border-[1.5px] transition-colors ${
                filtersOpen || activeFilterCount
                  ? 'bg-highlight border-accent text-accent'
                  : 'bg-panel border-border text-ink-soft'
              }`}
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
              <span
                className="text-[13px] leading-none transition-transform"
                style={{ transform: filtersOpen ? 'rotate(180deg)' : 'none' }}
              >
                ⌄
              </span>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="font-semibold text-[11px] tracking-wider uppercase text-fainter">
                Sort
              </span>
              <select
                value={sortBy}
                onChange={(e) => {
                  const newSortBy = e.target.value;
                  setSortBy(newSortBy);
                  setSortOrder(newSortBy === 'created' ? 'desc' : 'asc');
                }}
                className="appearance-none border-[1.5px] border-border bg-panel rounded-full pl-3.5 pr-7 py-2 font-semibold text-[13px] text-ink cursor-pointer"
              >
                <option value="created">Newest</option>
                <option value="due">Due date</option>
                <option value="project">Project</option>
                <option value="name">Name</option>
                <option value="assignee">Who</option>
              </select>
            </div>
          </div>

          <div className={`${filtersOpen ? 'flex' : 'hidden'} md:flex flex-col gap-3.5`}>
            {filterGroups}
          </div>
        <div className="md:max-w-6xl md:mx-auto bg-panel">

        <div className="hidden md:grid grid-cols-[22px_minmax(0,1fr)_96px_96px_210px_150px] items-center gap-x-4 px-6 pt-2.5 pb-2 border-b border-border-soft font-semibold text-[11px] tracking-wider uppercase text-fainter">
          <span />
          {renderHeader('Task', 'name')}
          {renderHeader('Created', 'created')}
          {renderHeader('Due', 'due')}
          {renderHeader('Project', 'project')}
          {renderHeader('Who', 'assignee')}
        </div>

        <div className="flex-1 overflow-auto px-4 md:px-6 py-1.5">
          <div className="md:hidden pt-2.5 pb-1 px-0.5 font-semibold text-[11px] tracking-wider uppercase text-fainter">
            {countLabel}
          </div>
          {filtered.map((t) => (
            <div key={t.gid} className="border-b border-border-soft">
              <TaskRow
                task={t}
                projectColor={projectColors.get(t.projects?.[0]?.gid)}
                onToggle={handleToggle}
                onOpen={setSelectedId}
                isMobile={isMobile}
              />
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-11 px-2.5 text-center text-fainter font-medium text-[15px] leading-snug">
              Nothing here with these filters.
            </div>
          )}

          {isMobile ? (
            <div className="flex items-center gap-[11px] my-3 px-3.5 py-3 bg-panel border-[1.5px] border-border rounded-xl shadow-[0_1px_2px_rgba(60,50,35,0.05)]">
              <span className="w-[26px] h-[26px] flex-none rounded-full bg-accent flex items-center justify-center text-white text-lg font-semibold leading-none">
                +
              </span>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Add a task…"
                className="flex-1 min-w-0 border-0 outline-none bg-transparent font-semibold text-[15px] text-ink"
              />
            </div>
          ) : (
            <div className="flex items-center gap-4 pt-3.5 pb-5">
              <span className="w-[22px] h-[22px] flex-none rounded-lg border-2 border-dashed border-[#d7d0c5] flex items-center justify-center text-[#bcb5a9] text-base leading-none">
                +
              </span>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Add a task…"
                className="flex-1 border-0 outline-none bg-transparent font-medium text-[15px] text-ink"
              />
            </div>
          )}
        </div>
      </div>

      {writeError && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+20px)] left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] bg-ink text-white font-medium text-[13px] px-4 py-2.5 rounded-full shadow-[0_8px_24px_rgba(40,32,20,0.3)] whitespace-nowrap overflow-hidden text-ellipsis">
          {writeError}
        </div>
      )}

      {selected && (
        <TaskDetailModal
          task={selected}
          projectColor={projectColors.get(selected.projects?.[0]?.gid)}
          onClose={() => setSelectedId(null)}
          onToggle={handleToggle}
          onNotesChange={handleNotesChange}
          isMobile={isMobile}
        />
      )}
    </div>
</div>
  );
}
