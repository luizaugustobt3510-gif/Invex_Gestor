import { FitnessLayout } from '@/components/fitness/FitnessLayout';
import { FitnessCard } from '@/components/fitness/FitnessCard';
import { Dumbbell, Sparkles } from 'lucide-react';

const FitnessTreinos = () => (
  <FitnessLayout>
    <h1 className="text-2xl font-black mb-1">Treinos</h1>
    <p className="text-sm text-slate-400 mb-4">Fichas, exercícios e cronômetro</p>

    <FitnessCard className="text-center py-10">
      <Dumbbell className="w-12 h-12 mx-auto text-cyan-400 mb-3" />
      <h2 className="text-lg font-bold mb-2">Em construção</h2>
      <p className="text-sm text-slate-400 max-w-xs mx-auto">
        Cadastro de fichas, exercícios com vídeo, cronômetro flutuante e registro de cargas estão a caminho.
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-fuchsia-300">
        <Sparkles className="w-3.5 h-3.5" /> Fase 2 do roadmap
      </div>
    </FitnessCard>
  </FitnessLayout>
);

export default FitnessTreinos;
