interface Props {
  value: number;
  max: number;
  label?: string;
  size?: 'sm' | 'md';
}

// Velocímetro semicircular reutilizável
export const Speedometer = ({ value, max, label, size = 'md' }: Props) => {
  const m = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(1, value / m));
  const angle = 180 + pct * 180; // arco inferior (180 -> 360)
  const color = pct < 0.5 ? '#f43f5e' : pct < 0.85 ? '#f59e0b' : '#10b981';
  const r = 70;
  const cx = 90;
  const cy = 90;
  const arc = (start: number, end: number) => {
    const s = (start * Math.PI) / 180;
    const e = (end * Math.PI) / 180;
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  const small = size === 'sm';
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 110" className={small ? 'w-full max-w-[160px]' : 'w-full max-w-[260px]'}>
        <path d={arc(180, 360)} stroke="rgba(148,163,184,0.25)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d={arc(180, angle)} stroke={color} strokeWidth="14" fill="none" strokeLinecap="round" />
        <line
          x1={cx}
          y1={cy}
          x2={cx + (r - 8) * Math.cos((angle * Math.PI) / 180)}
          y2={cy + (r - 8) * Math.sin((angle * Math.PI) / 180)}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="6" fill={color} />
        <text x={cx} y={cy - 18} textAnchor="middle" fontSize={small ? 16 : 18} fontWeight="800" fill="currentColor">
          {Math.round(pct * 100)}%
        </text>
      </svg>
      {label && <div className="text-xs text-slate-400 -mt-1 text-center">{label}</div>}
    </div>
  );
};
