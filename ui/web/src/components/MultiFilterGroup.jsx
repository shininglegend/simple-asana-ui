const BASE =
  'font-semibold text-[13px] px-3.5 py-1.5 rounded-full cursor-pointer border-[1.5px] transition-colors whitespace-nowrap';

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
    <div className="flex items-center gap-2.5 flex-wrap">
      <span className="w-[58px] flex-none font-semibold text-[11px] tracking-wider uppercase text-faint">
        {label}
      </span>
      <div className="flex gap-2 flex-wrap">
        <button type="button" className={pillClasses(isAll)} onClick={onSelectAll}>
          All
        </button>
        <button type="button" className={pillClasses(isNone)} onClick={onSelectNone}>
          Clear
        </button>
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
                  className="w-2.5 h-2.5 rounded-full inline-block mr-1.5 align-middle -mt-0.5"
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
