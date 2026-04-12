interface Props {
  current: number;
  target: number;
  label: string;
  size?: number;
}

export function ProgressionRing({ current, target, label, size = 64 }: Props) {
  const pct = Math.min((current / Math.max(1, target)) * 100, 100);
  const hit = current >= target;
  const color = hit ? "hsl(var(--success, 142 71% 45%))" : pct >= 50 ? "#C9A84C" : "hsl(var(--muted-foreground))";
  const r = 24;
  const ci = 2 * Math.PI * r;
  const offset = ci - (pct / 100) * ci;

  return (
    <div className="text-center">
      <svg width={size} height={size} viewBox="0 0 60 60" aria-label={`${label} ${current}/${target}`}>
        <circle cx="30" cy="30" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
        <circle
          cx="30"
          cy="30"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={ci}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 30 30)"
          style={{ transition: "stroke-dashoffset 0.4s" }}
        />
        <text
          x="30"
          y="28"
          textAnchor="middle"
          fill={color}
          fontSize="14"
          fontWeight="bold"
          fontFamily="Cormorant Garamond, Georgia, serif"
        >
          {current}
        </text>
        <text x="30" y="40" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">
          /{target}
        </text>
      </svg>
      <div
        className="text-[10px] mt-1"
        style={{ color: hit ? color : "hsl(var(--muted-foreground))" }}
      >
        {label}
      </div>
    </div>
  );
}
