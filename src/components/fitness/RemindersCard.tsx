import { FitnessCard } from './FitnessCard';
import { useFitnessReminders } from '@/hooks/useFitnessReminders';
import { Bell, Droplet, Utensils, Check } from 'lucide-react';

export const RemindersCard = () => {
  const { items, done, toggle, proximo } = useFitnessReminders();
  const total = items.length;
  const feitos = done.size;
  const pct = total ? (feitos / total) * 100 : 0;

  return (
    <FitnessCard className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-300" />
          <span className="text-sm font-semibold">Lembretes de hoje</span>
        </div>
        <span className="text-[11px] text-slate-400">{feitos}/{total}</span>
      </div>

      <div className="h-1.5 rounded-full bg-slate-800/60 overflow-hidden mb-3">
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #fbbf24, #22d3ee)' }}
        />
      </div>

      {proximo && (
        <div className="text-[11px] text-amber-200 mb-2 flex items-center gap-1.5">
          <span className="font-mono">{proximo.hora}</span>
          <span>· próximo: {proximo.label}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
        {items.map(i => {
          const isDone = done.has(i.id);
          const Icon = i.kind === 'agua' ? Droplet : Utensils;
          const color = i.kind === 'agua' ? 'text-cyan-300' : 'text-fuchsia-300';
          return (
            <button
              key={i.id}
              onClick={() => toggle(i.id)}
              className={`flex items-center gap-2 rounded-lg border p-2 text-left transition active:scale-[0.98] ${
                isDone
                  ? 'border-emerald-400/40 bg-emerald-500/10'
                  : 'border-slate-700 bg-slate-800/40'
              }`}
            >
              <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                isDone ? 'bg-emerald-400 text-slate-900' : `bg-slate-800/80 ${color}`
              }`}>
                {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold truncate">{i.label}</p>
                <p className="text-[10px] text-slate-400 font-mono">{i.hora}</p>
              </div>
            </button>
          );
        })}
      </div>
    </FitnessCard>
  );
};
