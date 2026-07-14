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
            {currentStatus && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border truncate max-w-[90px]"
                style={{
                  backgroundColor: getStatusStyle(currentStatus.name, currentStatus.color).bg,
                  color: getStatusStyle(currentStatus.name, currentStatus.color).text,
                  borderColor: getStatusStyle(currentStatus.name, currentStatus.color).border,
                }}
              >
                {currentStatus.name}
              </span>
            )}
            <span className="flex items-center gap-1.5 flex-wrap min-w-0">
              {task.projects && task.projects.length > 0 ? (
                task.projects.map((p) => {
                  const color = projectColors.get(p.gid) ?? '#b8b2a8';
                  return (
                    <span key={p.gid} className="inline-flex items-center gap-[4px] min-w-0">
                      <span
                        className="w-2 h-2 rounded-full flex-none"
                        style={{ background: color }}
                      />
                      <span className="font-medium text-xs text-muted truncate max-w-[80px]">
                        {p.name}
                      </span>
                    </span>
                  );
                })
              ) : (
                <span className="font-medium text-xs text-danger italic">No Project</span>
              )}
            </span>
            <span
              className={`font-medium text-xs ${
                assigneeName ? 'text-muted' : 'text-danger italic'
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
      className="grid grid-cols-[22px_minmax(0,1fr)_70px_70px_100px_210px_150px] items-center gap-x-4 py-2.5 cursor-pointer hover:bg-[#faf8f4] transition-colors"
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

      <span className="flex items-center gap-1 flex-wrap min-w-0">
        {task.projects && task.projects.length > 0 ? (
          task.projects.map((p) => {
            const color = projectColors.get(p.gid) ?? '#b8b2a8';
            return (
              <span
                key={p.gid}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#faf8f4] border border-border-soft truncate max-w-[125px]"
                style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                title={p.name}
              >
                {p.name}
              </span>
            );
          })
        ) : (
          <span className="font-medium text-xs text-danger italic">No Project</span>
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
