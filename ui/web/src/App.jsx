import { useEffect, useMemo, useState } from 'react';
import FilterGroup from './components/FilterGroup.jsx';
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

  const [status, setStatus] = useState('Incomplete');
  const [project, setProject] = useState('All');
  const [person, setPerson] = useState('Anyone');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('created');
  const [newTitle, setNewTitle] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isMobile = useIsMobile();

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        const wsGid = me.workspaces?.[0]?.gid;
        if (!wsGid) throw new Error('No workspace found for this user.');
        setWorkspaceGid(wsGid);
        const [projectList, userList] = await Promise.all([
          getProjects(wsGid),
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
      if (project !== 'All' && t.projects?.[0]?.name !== project) return false;
      if (person === 'Unassigned' && t.assignee) return false;
      if (person !== 'Anyone' && person !== 'Unassigned' && t.assignee?.name !== person)
        return false;
      return true;
    });
    const far = '9999-99-99';
    out.sort((a, b) => {
      if (sortBy === 'created') return (b.created_at ?? '').localeCompare(a.created_at ?? '');
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'project')
        return (
          (a.projects?.[0]?.name ?? '').localeCompare(b.projects?.[0]?.name ?? '') ||
          (a.due_on ?? far).localeCompare(b.due_on ?? far)
        );
      return (a.due_on ?? far).localeCompare(b.due_on ?? far);
    });
    return out;
  }, [tasks, query, status, project, person, sortBy]);

  const selected = tasks.find((t) => t.gid === selectedId) ?? null;

  function updateTaskLocal(gid, patch) {
    setTasks((ts) => ts.map((t) => (t.gid === gid ? { ...t, ...patch } : t)));
  }

  async function handleToggle(gid, completed) {
    updateTaskLocal(gid, { completed });
    await setTaskCompleted(gid, completed);
  }

  async function handleNotesChange(gid, notes) {
    updateTaskLocal(gid, { notes });
    await setTaskNotes(gid, notes);
  }

  async function handleAddTask() {
    const title = newTitle.trim();
    if (!title || !workspaceGid) return;
    setNewTitle('');
    const targetProject = project !== 'All' ? projectByName.get(project) : projects[0];
    const assigneeGid =
      person !== 'Anyone' && person !== 'Unassigned'
        ? people.find((p) => p.name === person)?.gid
        : null;
    const created = await createTask({
      name: title,
      workspaceGid,
      projectGid: targetProject?.gid,
      assigneeGid,
    });
    setTasks((ts) => [
      {
        ...created,
        projects: targetProject ? [targetProject] : [],
        assignee: assigneeGid ? people.find((p) => p.gid === assigneeGid) : null,
      },
      ...ts,
    ]);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-muted">
        Loading your tasks…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 text-ink px-5 text-center">
        <p>{error}</p>
        <a href="/auth/login" className="font-semibold">
          Try logging in again
        </a>
      </div>
    );
  }

  const activeFilterCount =
    (status !== 'Incomplete' ? 1 : 0) + (project !== 'All' ? 1 : 0) + (person !== 'Anyone' ? 1 : 0);
  const countLabel = `${filtered.length} ${filtered.length === 1 ? 'task' : 'tasks'}`;

  const filterGroups = (
    <>
      <FilterGroup
        label="Show"
        options={STATUS_OPTIONS}
        value={status}
        variant="status"
        onSelect={setStatus}
      />
      <FilterGroup
        label="Project"
        options={['All', ...projects.map((p) => p.name)]}
        value={project}
        variant="soft"
        onSelect={setProject}
      />
      <FilterGroup
        label="Who"
        options={['Anyone', ...people.map((p) => p.name), 'Unassigned']}
        value={person}
        variant="soft"
        onSelect={setPerson}
      />
    </>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="min-h-screen flex flex-col max-w-[700px] mx-auto bg-white">
        <div className="sticky top-0 z-[5] bg-panel-alt border-b border-border px-4 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] md:px-6.5 md:py-5.5 flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="m-0 font-bold text-[17px] md:text-[22px] text-ink tracking-tight">
              Jim&rsquo;s Tasks
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

          <div className="flex items-center gap-2 bg-white border-[1.5px] border-border rounded-[10px] px-3.5 py-2">
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className={`md:hidden flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-[13px] border-[1.5px] transition-colors ${
                filtersOpen || activeFilterCount
                  ? 'bg-[#faf0eb] border-accent text-accent'
                  : 'bg-white border-border text-ink-soft'
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
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none border-[1.5px] border-border bg-white rounded-full pl-3.5 pr-7 py-2 font-semibold text-[13px] text-ink cursor-pointer"
              >
                <option value="created">Newest</option>
                <option value="due">Due date</option>
                <option value="project">Project</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          <div className={`${filtersOpen ? 'flex' : 'hidden'} md:flex flex-col gap-3.5`}>
            {filterGroups}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3.5 px-8 pt-2.5 pb-2 border-b border-border-soft">
          <span className="w-[22px] flex-none" />
          <span className="flex-1 min-w-0 font-semibold text-[11px] tracking-wider uppercase text-fainter">
            Task
          </span>
          <span className="w-[90px] flex-none font-semibold text-[11px] tracking-wider uppercase text-fainter">
            Due
          </span>
          <span className="w-[110px] flex-none font-semibold text-[11px] tracking-wider uppercase text-fainter">
            Project
          </span>
          <span className="w-[78px] flex-none text-right font-semibold text-[11px] tracking-wider uppercase text-fainter">
            Who
          </span>
        </div>

        <div className="flex-1 overflow-auto px-4 md:px-6.5 py-1.5">
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
            <div className="flex items-center gap-[11px] my-3 px-3.5 py-3 bg-white border-[1.5px] border-border rounded-xl shadow-[0_1px_2px_rgba(60,50,35,0.05)]">
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
            <div className="flex items-center gap-3.5 px-1.5 pt-3.5 pb-5">
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
  );
}
