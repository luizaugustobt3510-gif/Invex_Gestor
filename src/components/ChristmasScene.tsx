import { useMemo } from "react";

/** Decorative Christmas overlay (snow + flying reindeer sleigh) for login screens only. */
export function ChristmasScene() {
  const flakes = useMemo(
    () =>
      Array.from({ length: 45 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 3 + Math.random() * 6,
        duration: 7 + Math.random() * 10,
        delay: -Math.random() * 15,
        drift: (Math.random() - 0.5) * 80,
        opacity: 0.5 + Math.random() * 0.5,
      })),
    []
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <style>{`
        @keyframes xmas-fall { 0%{transform:translate(0,-10vh)} 100%{transform:translate(var(--drift),110vh)} }
        @keyframes xmas-sleigh { 0%{transform:translateX(-30vw) translateY(0)} 25%{transform:translateX(25vw) translateY(-14px)} 50%{transform:translateX(60vw) translateY(6px)} 75%{transform:translateX(95vw) translateY(-10px)} 100%{transform:translateX(130vw) translateY(0)} }
        @keyframes xmas-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes xmas-twinkle { 0%,100%{opacity:.3} 50%{opacity:1} }
        @media (prefers-reduced-motion: reduce){ .xmas-anim{animation:none!important} }
      `}</style>

      {flakes.map((f) => (
        <span
          key={f.id}
          className="xmas-anim absolute top-0 rounded-full bg-card shadow-card"
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size,
            opacity: f.opacity,
            ["--drift" as string]: `${f.drift}px`,
            animation: `xmas-fall ${f.duration}s linear ${f.delay}s infinite`,
            boxShadow: "0 0 6px hsl(var(--primary) / 0.35)",
          }}
        />
      ))}

      {/* Sleigh with reindeer */}
      <div
        className="xmas-anim absolute left-0 top-[8%] text-3xl sm:text-4xl whitespace-nowrap"
        style={{ animation: "xmas-sleigh 18s linear infinite" }}
      >
        {["🦌", "🦌", "🦌"].map((r, i) => (
          <span
            key={i}
            className="xmas-anim inline-block"
            style={{ animation: `xmas-bob 0.6s ease-in-out ${i * 0.15}s infinite`, transform: "scaleX(-1)" }}
          >
            <span className="inline-block" style={{ transform: "scaleX(-1)" }}>{r}</span>
          </span>
        ))}
        <span className="inline-block ml-1">🛷🎅</span>
      </div>

      {/* Twinkling decorations */}
      {[
        { e: "⭐", l: "6%", t: "20%" },
        { e: "🎄", l: "4%", b: "6%" },
        { e: "🎁", r: "5%", b: "7%" },
        { e: "✨", r: "10%", t: "28%" },
        { e: "🔔", l: "12%", t: "55%" },
      ].map((d, i) => (
        <span
          key={i}
          className="xmas-anim absolute text-2xl sm:text-4xl"
          style={{ left: d.l, right: d.r, top: d.t, bottom: d.b, animation: `xmas-twinkle 2.5s ease-in-out ${i * 0.4}s infinite` }}
        >
          {d.e}
        </span>
      ))}
    </div>
  );
}
