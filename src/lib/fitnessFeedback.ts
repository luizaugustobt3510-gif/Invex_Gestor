// Feedback sensorial do Invex Fitness: sons curtos, vibração e confete.
const MUTE_KEY = 'fitness_sound_muted';

export const isFitnessMuted = () => {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
};
export const setFitnessMuted = (m: boolean) => {
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* ignore */ }
};

let ctx: AudioContext | null = null;
const audio = () => {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

const tone = (freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) => {
  const a = audio();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = a.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
};

export const haptic = (pattern: number | number[] = 15) => {
  try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
};

export type FitnessSfx = 'tap' | 'done' | 'restEnd' | 'tick' | 'celebrate';

export const playSfx = (kind: FitnessSfx) => {
  if (kind === 'tap') haptic(10);
  if (kind === 'done') haptic([20, 40, 30]);
  if (kind === 'restEnd') haptic([200, 100, 200, 100, 300]);
  if (kind === 'celebrate') haptic([40, 60, 40, 60, 120]);
  if (isFitnessMuted()) return;
  switch (kind) {
    case 'tap': tone(880, 0, 0.06, 'triangle', 0.08); break;
    case 'tick': tone(1200, 0, 0.05, 'square', 0.05); break;
    case 'done': tone(660, 0, 0.09, 'triangle'); tone(990, 0.08, 0.14, 'triangle'); break;
    case 'restEnd': [0, 0.25, 0.5].forEach((s, i) => tone(i === 2 ? 1320 : 990, s, 0.18, 'square', 0.12)); break;
    case 'celebrate': [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.2, 'triangle', 0.14)); break;
  }
};

/** Confete leve via canvas temporário (sem dependências). */
export const celebrate = () => {
  if (typeof document === 'undefined') return;
  playSfx('celebrate');
  const c = document.createElement('canvas');
  c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999';
  c.width = window.innerWidth; c.height = window.innerHeight;
  document.body.appendChild(c);
  const g = c.getContext('2d');
  if (!g) { c.remove(); return; }
  const colors = ['#22d3ee', '#e879f9', '#34d399', '#facc15', '#a78bfa'];
  const parts = Array.from({ length: 120 }, () => ({
    x: c.width / 2, y: c.height * 0.4,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
    s: Math.random() * 6 + 4, r: Math.random() * Math.PI, col: colors[Math.floor(Math.random() * colors.length)],
  }));
  const startT = performance.now();
  const frame = (t: number) => {
    const el = t - startT;
    g.clearRect(0, 0, c.width, c.height);
    g.globalAlpha = Math.max(0, 1 - el / 2200);
    parts.forEach(p => {
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += 0.15;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.col;
      g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore();
    });
    if (el < 2200) requestAnimationFrame(frame); else c.remove();
  };
  requestAnimationFrame(frame);
};
