const BASE =
  'font-semibold text-[14px] px-2.5 py-0.5 rounded-full cursor-pointer border transition-colors whitespace-nowrap';

function pillClasses(active) {
  if (active) return `${BASE} bg-selected text-ink border-selected hover:bg-[#c4cbd5]`;
  return `${BASE} bg-panel text-muted border-border hover:border-[#b8b2a8] hover:text-ink`;
}

export default function MultiFilterGroup({
  label,
  options,
  selected,
  onToggle,
  onSelectAll,
  onSelectNone,
}) {
  const isAll = selected === null;
  const isNone = Array.isArray(selected) && selected.length === 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[12px] tracking-wider uppercase text-faint">
          {label}
        </span>
        <div className="flex gap-2 items-center">
          <button
            type="button"
            className={`text-[13px] font-semibold cursor-pointer hover:underline ${
              isAll ? 'text-ink font-bold' : 'text-accent hover:text-accent-hover'
            }`}
            onClick={onSelectAll}
          >
            All
          </button>
          <span className="text-[10px] text-border">|</span>
          <button
            type="button"
            className={`text-[13px] font-semibold cursor-pointer hover:underline ${
              isNone ? 'text-ink font-bold' : 'text-accent hover:text-accent-hover'
            }`}
            onClick={onSelectNone}
          >
            Clear
          </button>
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((opt) => {
          const name = typeof opt === 'object' ? opt.name : opt;
          const color = typeof opt === 'object' ? opt.color : null;
          const active = isAll || (Array.isArray(selected) && selected.includes(name));
          return (
            <button
              key={name}
              type="button"
              className={pillClasses(active)}
              onClick={() => onToggle(name)}
            >
              {color && (
                <span
                  className="w-2 h-2 rounded-full inline-block mr-1.5 align-middle -mt-0.5"
                  style={{ backgroundColor: color }}
                />
              )}
              <span>{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
