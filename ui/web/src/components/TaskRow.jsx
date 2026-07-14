import { formatDateShort, isOverdue } from '../lib/format.js';

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

export default function TaskRow({ task, projectColor, onToggle, onOpen, isMobile }) {
  const done = !!task.completed;
  const overdue = isOverdue(task.due_on, done);
  const projectName = task.projects?.[0]?.name ?? '';
  const assigneeName = task.assignee?.name;

  if (isMobile) {
    return (
      <div
        onClick={() => onOpen(task.gid)}
        className="flex items-center gap-[11px] py-2.5 px-0.5 cursor-pointer"
      >
        <Checkbox done={done} onToggle={() => onToggle(task.gid, !done)} size={24} />
        <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
          <span
            className={`font-medium text-[15px] leading-[1.35] truncate ${
              done ? 'text-fainter line-through' : 'text-ink'
            }`}
          >
            {task.name}
          </span>
          <div className="flex items-center gap-[9px] flex-wrap">
            <span
              className={`font-semibold text-xs ${
                overdue ? 'text-danger' : done ? 'text-placeholder' : 'text-muted'
              }`}
            >
              {formatDateShort(task.due_on)}
            </span>
            <span className="flex items-center gap-[5px] min-w-0">
              <span
                className="w-2 h-2 rounded-full flex-none"
                style={{ background: projectColor ?? '#b8b2a8' }}
              />
              <span className="font-medium text-xs text-muted truncate">{projectName}</span>
            </span>
            <span
              className={`font-medium text-xs ${
                assigneeName ? 'text-muted' : 'text-fainter italic'
              }`}
            >
              {assigneeName ?? 'Unassigned'}
            </span>
            <span className="font-medium text-xs text-muted">
              Created {formatDateShort(task.created_at ? task.created_at.split('T')[0] : null)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpen(task.gid)}
      className="grid grid-cols-[22px_minmax(0,1fr)_96px_96px_210px_150px] items-center gap-x-4 py-2.5 cursor-pointer hover:bg-[#faf8f4] transition-colors"
    >
      <Checkbox done={done} onToggle={() => onToggle(task.gid, !done)} />

      <span
        className={`min-w-0 font-medium text-[15px] leading-snug truncate ${
          done ? 'text-fainter line-through' : 'text-ink'
        }`}
      >
        {task.name}
      </span>

      <span className="font-medium text-xs text-muted">
        {formatDateShort(task.created_at ? task.created_at.split('T')[0] : null)}
      </span>

      <span
        className={`font-semibold text-xs ${
          overdue ? 'text-danger' : done ? 'text-placeholder' : 'text-muted'
        }`}
      >
        {formatDateShort(task.due_on)}
      </span>

      <span className="flex items-center gap-1.5 min-w-0">
        <span
          className="w-[9px] h-[9px] rounded-full flex-none"
          style={{ background: projectColor ?? '#b8b2a8' }}
        />
        <span className="font-medium text-xs text-muted truncate">{projectName}</span>
      </span>

      <span
        className={`min-w-0 font-medium text-xs truncate ${
          assigneeName ? 'text-muted' : 'text-fainter italic'
        }`}
      >
        {assigneeName ?? 'Unassigned'}
      </span>
    </div>
  );
}
