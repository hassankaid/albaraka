interface StepHeaderProps {
  current: number;
  total: number;
  title: string;
  sub: string;
  hint?: string;
}

export function StepHeader({ current, total, title, sub, hint }: StepHeaderProps) {
  const percent = Math.round((current / total) * 100);
  return (
    <div className="mb-6">
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-white/40">
        <span>
          Étape {current} / {total}
        </span>
        <span className="font-semibold text-[#C9A84C]">{percent}%</span>
      </div>
      <div className="mb-4 h-[3px] overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full transition-[width] duration-700"
          style={{
            width: `${percent}%`,
            background: "linear-gradient(90deg, #C9A84C, #E8C770)",
            boxShadow: "0 0 10px rgba(201,168,76,0.5)",
          }}
        />
      </div>
      <h2 className="mb-1.5 text-[22px] font-semibold leading-tight tracking-tight text-white">
        {title}
      </h2>
      <p className="text-[13px] leading-[1.65] text-white/60">{sub}</p>
      {hint && (
        <p
          className="mt-3 rounded-xl px-3.5 py-2.5 font-serif text-[12.5px] italic leading-[1.6]"
          style={{
            background: "rgba(201,168,76,0.05)",
            borderLeft: "2px solid rgba(201,168,76,0.5)",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          💡 {hint}
        </p>
      )}
    </div>
  );
}
