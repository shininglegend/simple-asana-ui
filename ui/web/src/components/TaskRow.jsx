import { formatDateShort, isOverdue, firstName } from '../lib/format.js';
import { getStatusStyle, getPriorityStyle, getPriorityBgClass } from '../lib/colors.js';
import { getTaskPriority } from '../lib/filterTasks.js';

function Checkbox({ done, onToggle, size = 22 }) {
  return (
    <button
      type="button"
      aria-label="toggle complete"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      style={{ width: size, height: size }}
      className={`flex-none rounded-[7px] border-2 flex items-center justify-center cursor-pointer transition-all ${
        done
          ? 'bg-accent border-accent hover:bg-accent-hover hover:border-accent-hover'
          : 'bg-panel border-border hover:bg-panel-alt hover:border-muted'
      }`}
    >
      {done && (
        <span className="w-[6px] h-[11px] border-white border-solid border-r-[2.5px] border-b-[2.5px] rotate-[43deg] -mt-0.5" />
      )}
    </button>
  );
}

export default function TaskRow({ task, projectColors, onToggle, onOpen, isMobile }) {
  const done = !!task.completed;
  const overdue = isOverdue(task.due_on, done);
  const assigneeName = firstName(task.assignee?.name);
  const currentStatus =
    task.custom_fields?.find((f) => f.name?.toLowerCase() === 'status')?.enum_value || null;
  const priority = getTaskPriority(task);

  const metaLine = (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      <span
        className={`text-[13px] font-normal ${assigneeName ? 'text-muted' : 'text-danger italic'}`}
      >
        {assigneeName ?? 'Unassigned'}
      </span>
      {task.due_on ? (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border truncate ${
            overdue
              ? 'bg-danger/10 text-danger border-danger/20'
              : done
                ? 'bg-panel border-border-soft text-placeholder'
                : 'bg-panel border-border-soft text-muted'
          }`}
        >
          Due on {formatDateShort(task.due_on)}
        </span>
      ) : (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-panel border border-border-soft text-[11px] font-medium text-placeholder italic">
          No due date
        </span>
      )}
      {task.num_subtasks > 0 && (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-panel border border-border-soft text-[11px] font-medium text-muted"
          title={`${task.num_subtasks} ${task.num_subtasks === 1 ? 'subtask' : 'subtasks'}`}
        >
          <svg
            className="w-3 h-3 text-muted/70 flex-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 6v6h8m0 0l-3-3m3 3l-3 3" />
          </svg>
          <span>{task.num_subtasks}</span>
        </span>
      )}
      <span
        className="md:inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border truncate max-w-[150px]"
        style={{
          backgroundColor: getPriorityStyle(priority).bg,
          color: getPriorityStyle(priority).text,
          borderColor: getPriorityStyle(priority).border,
        }}
      >
        {priority}
      </span>
      {/* Split the row here on mobile: full-width zero-height spacer forces a wrap */}
      <span className="basis-full h-0 md:hidden" aria-hidden="true" />
      {currentStatus ? (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border truncate max-w-[150px]"
          style={{
            backgroundColor: getStatusStyle(currentStatus.name, currentStatus.color).bg,
            color: getStatusStyle(currentStatus.name, currentStatus.color).text,
            borderColor: getStatusStyle(currentStatus.name, currentStatus.color).border,
          }}
        >
          {currentStatus.name}
        </span>
      ) : (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-panel border border-border-soft text-[11px] font-medium text-placeholder italic">
          No status
        </span>
      )}
      {task.projects && task.projects.length > 0 ? (
        task.projects.map((p) => {
          const color = projectColors.get(p.gid) ?? '#b8b2a8';
          return (
            <span
              key={p.gid}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-panel border border-border-soft min-w-0 text-[11px]"
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-none"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium text-muted truncate max-w-[120px]" title={p.name}>
                {p.name}
              </span>
            </span>
          );
        })
      ) : (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-panel border border-border-soft text-[11px] font-medium text-danger/80 italic">
          No Project
        </span>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div
        onClick={() => onOpen(task.gid)}
        className={`flex items-start gap-3 py-3 px-2 -mx-2 rounded-lg cursor-pointer transition-colors ${getPriorityBgClass(priority)}`}
      >
        <div className="flex-none pt-[1px]">
          <Checkbox done={done} onToggle={() => onToggle(task.gid, !done)} size={22} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span
            className={`font-semibold text-base leading-snug break-words ${
              done ? 'text-fainter line-through' : 'text-ink'
            }`}
          >
            {task.name}
          </span>
          {metaLine}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpen(task.gid)}
      className={`grid grid-cols-[22px_minmax(0,1fr)] items-start gap-x-4 py-2.5 px-3 -mx-3 rounded-lg cursor-pointer transition-colors ${getPriorityBgClass(priority)}`}
    >
      <div className="flex-none pt-[1px]">
        <Checkbox done={done} onToggle={() => onToggle(task.gid, !done)} />
      </div>

      {/* Task Name, Metadata, & Tag Badges */}
      <div className="min-w-0 flex flex-col gap-1">
        {/* Title Line */}
        <span
          className={`min-w-0 font-medium text-[15px] leading-snug break-words ${
            done ? 'text-fainter line-through' : 'text-ink'
          }`}
        >
          {task.name}
        </span>

        {/* Combined line 2 */}
        {metaLine}
      </div>
    </div>
  );
}
