import { formatDateShort, isOverdue } from '../lib/format.js';

export default function TaskRow({ task, projectColor, onToggle, onOpen }) {
  const done = !!task.completed;
  const overdue = isOverdue(task.due_on, done);
  const projectName = task.projects?.[0]?.name ?? '';
  const assigneeName = task.assignee?.name;

  return (
    <div
      onClick={() => onOpen(task.gid)}
      className="flex items-center gap-3 py-3 px-1.5 cursor-pointer rounded-lg hover:bg-[#faf8f4] transition-colors"
    >
      <button
        type="button"
        aria-label="toggle complete"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task.gid, !done);
        }}
        className={`w-[22px] h-[22px] flex-none rounded-[7px] border-2 flex items-center justify-center cursor-pointer transition-all ${
          done
            ? 'bg-accent border-accent hover:bg-accent-hover hover:border-accent-hover'
            : 'bg-white border-[#cfc8bd] hover:bg-[#f3efe8] hover:border-[#9c968b]'
        }`}
      >
        {done && (
          <span className="w-[6px] h-[11px] border-white border-solid border-r-[2.5px] border-b-[2.5px] rotate-[43deg] -mt-0.5" />
        )}
      </button>

      <span
        className={`flex-1 min-w-0 font-medium text-[15px] leading-snug truncate ${
          done ? 'text-fainter line-through' : 'text-ink'
        }`}
      >
        {task.name}
      </span>

      <span
        className={`w-[90px] flex-none font-semibold text-xs ${
          overdue ? 'text-danger' : done ? 'text-placeholder' : 'text-muted'
        }`}
      >
        {formatDateShort(task.due_on)}
      </span>

      <span className="flex items-center gap-1.5 w-[110px] flex-none">
        <span
          className="w-[9px] h-[9px] rounded-full flex-none"
          style={{ background: projectColor ?? '#b8b2a8' }}
        />
        <span className="font-medium text-xs text-muted whitespace-nowrap overflow-hidden text-ellipsis">
          {projectName}
        </span>
      </span>

      <span
        className={`w-[78px] flex-none text-right font-medium text-xs whitespace-nowrap overflow-hidden text-ellipsis ${
          assigneeName ? 'text-muted' : 'text-fainter italic'
        }`}
      >
        {assigneeName ?? 'Unassigned'}
      </span>
    </div>
  );
}
