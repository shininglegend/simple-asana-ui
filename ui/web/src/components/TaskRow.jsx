import { formatDateShort, isOverdue } from '../lib/format.js';
import { getStatusStyle } from '../lib/colors.js';

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
  const assigneeName = task.assignee?.name;
  const currentStatus =
    task.custom_fields?.find((f) => f.name?.toLowerCase() === 'status')?.enum_value || null;

  if (isMobile) {
    const createdDate = formatDateShort(task.created_at ? task.created_at.split('T')[0] : null);
    const assigneeText = assigneeName ? `${assigneeName}` : 'Unassigned';

    return (
      <div
        onClick={() => onOpen(task.gid)}
        className="flex items-start gap-3 py-3 px-0.5 cursor-pointer"
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
          <div className="text-[13px] text-muted font-normal">
            {assigneeText} • {createdDate}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {task.due_on && (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border truncate ${
                  overdue
                    ? 'bg-danger/10 text-danger border-danger/20'
                    : done
                      ? 'bg-panel border-border-soft text-placeholder'
                      : 'bg-panel border-border-soft text-muted'
                }`}
              >
                Due {formatDateShort(task.due_on)}
              </span>
            )}
            {currentStatus && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border truncate max-w-[120px]"
                style={{
                  backgroundColor: getStatusStyle(currentStatus.name, currentStatus.color).bg,
                  color: getStatusStyle(currentStatus.name, currentStatus.color).text,
                  borderColor: getStatusStyle(currentStatus.name, currentStatus.color).border,
                }}
              >
                {currentStatus.name}
              </span>
            )}
            {task.projects && task.projects.length > 0 ? (
              task.projects.map((p) => {
                const color = projectColors.get(p.gid) ?? '#b8b2a8';
                return (
                  <span
                    key={p.gid}
                    className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-panel border border-border-soft min-w-0 text-[11px]"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-none"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium text-muted truncate max-w-[100px]" title={p.name}>
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
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpen(task.gid)}
      className="grid grid-cols-[22px_minmax(0,1fr)_70px_70px_100px_150px] items-center gap-x-4 py-2.5 px-3 -mx-3 rounded-lg cursor-pointer hover:bg-[#faf8f4] transition-colors"
    >
      <Checkbox done={done} onToggle={() => onToggle(task.gid, !done)} />

      {/* Task Name & Project Dots */}
      <div className="min-w-0 flex items-center gap-2">
        {task.projects && task.projects.length > 0 && (
          <div className="flex items-center gap-1.5 flex-none">
            {task.projects.map((p) => {
              const color = projectColors.get(p.gid) ?? '#b8b2a8';
              return (
                <span
                  key={p.gid}
                  className="w-2.5 h-2.5 rounded-full flex-none"
                  style={{ backgroundColor: color }}
                  title={p.name}
                />
              );
            })}
          </div>
        )}
        <span
          className={`min-w-0 font-medium text-[15px] leading-snug truncate ${
            done ? 'text-fainter line-through' : 'text-ink'
          }`}
        >
          {task.name}
        </span>
      </div>

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

      <span className="flex items-center min-w-0">
        {currentStatus ? (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border truncate max-w-[90px]"
            style={{
              backgroundColor: getStatusStyle(currentStatus.name, currentStatus.color).bg,
              color: getStatusStyle(currentStatus.name, currentStatus.color).text,
              borderColor: getStatusStyle(currentStatus.name, currentStatus.color).border,
            }}
            title={currentStatus.name}
          >
            {currentStatus.name}
          </span>
        ) : (
          <span className="text-[10px] text-placeholder italic">-</span>
        )}
      </span>

      <span
        className={`min-w-0 font-medium text-xs truncate ${
          assigneeName ? 'text-muted' : 'text-danger italic'
        }`}
      >
        {assigneeName ?? 'Unassigned'}
      </span>
    </div>
  );
}
