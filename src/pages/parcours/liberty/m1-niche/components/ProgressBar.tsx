interface ProgressBarProps {
  stepLabel: string;
  percent: number;
}

export function ProgressBar({ stepLabel, percent }: ProgressBarProps) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-white/40">
        <span>{stepLabel}</span>
        <span className="font-semibold text-[#C9A84C]">{safe}%</span>
      </div>
      <div
        className="h-[3px] overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full transition-[width] duration-700"
          style={{
            width: `${safe}%`,
            background: "linear-gradient(90deg, #C9A84C, #E8C770)",
            boxShadow: "0 0 10px rgba(201,168,76,0.5)",
          }}
        />
      </div>
    </div>
  );
}
