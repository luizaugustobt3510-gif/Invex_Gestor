import { useEffect, useState } from 'react';
import { FitnessLayout } from '@/components/fitness/FitnessLayout';
import { FitnessCard } from '@/components/fitness/FitnessCard';
import { Trophy, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Ach {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  icone: string;
  xp_recompensa: number;
  raridade: string;
}

const RARIDADE_COR: Record<string, string> = {
  comum: '#94a3b8',
  rara: '#22d3ee',
  epica: '#e879f9',
  lendaria: '#fbbf24',
};

const FitnessConquistas = () => {
  const [list, setList] = useState<Ach[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: all } = await supabase.from('fitness_achievements').select('*').order('xp_recompensa');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: my } = await supabase
          .from('fitness_user_achievements')
          .select('achievement_id')
          .eq('user_id', user.id);
        setUnlocked(new Set((my || []).map(m => m.achievement_id)));
      }
      setList((all || []) as Ach[]);
      setLoading(false);
    })();
  }, []);

  return (
    <FitnessLayout>
      <h1 className="text-2xl font-black mb-1">Conquistas</h1>
      <p className="text-sm text-slate-400 mb-4">
        {unlocked.size}/{list.length} desbloqueadas
      </p>

      {loading ? (
        <div className="text-center text-cyan-300 py-10">Carregando...</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {list.map(a => {
            const isUnlocked = unlocked.has(a.id);
            const cor = RARIDADE_COR[a.raridade] || '#94a3b8';
            return (
              <FitnessCard
                key={a.id}
                glow={isUnlocked ? 'cyan' : 'none'}
                className={!isUnlocked ? 'opacity-50' : ''}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: isUnlocked ? `${cor}30` : '#1e293b',
                      color: isUnlocked ? cor : '#475569',
                    }}
                  >
                    {isUnlocked ? <Trophy className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                  </div>
                  <p className="text-sm font-bold">{a.nome}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{a.descricao}</p>
                  <span
                    className="text-[10px] uppercase tracking-wide font-bold"
                    style={{ color: cor }}
                  >
                    +{a.xp_recompensa} XP · {a.raridade}
                  </span>
                </div>
              </FitnessCard>
            );
          })}
        </div>
      )}
    </FitnessLayout>
  );
};

export default FitnessConquistas;
