const BASE =
  'font-semibold text-[14px] px-2.5 py-0.5 rounded-full cursor-pointer border transition-colors whitespace-nowrap';

function pillClasses(active, variant) {
  if (active) return `${BASE} bg-selected text-ink border-selected hover:bg-[#c4cbd5]`;
  if (variant === 'status') return `${BASE} bg-panel text-ink border-ink hover:bg-[#f3efe8]`;
  return `${BASE} bg-panel text-muted border-border hover:border-[#b8b2a8] hover:text-ink`;
}

export default function FilterGroup({ label, options, value, variant = 'soft', onSelect }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-semibold text-[11px] tracking-wider uppercase text-faint">{label}</span>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((name) => (
          <button
            key={name}
            type="button"
            className={pillClasses(name === value, variant)}
            onClick={() => onSelect(name)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
