import { FitnessLayout } from '@/components/fitness/FitnessLayout';
import { FitnessCard } from '@/components/fitness/FitnessCard';
import { Apple, Sparkles, Utensils, Salad, Coffee } from 'lucide-react';

const FitnessAlimentacao = () => (
  <FitnessLayout>
    <h1 className="text-2xl font-black mb-1">Alimentação</h1>
    <p className="text-sm text-slate-400 mb-4">Registro de refeições e plano alimentar</p>

    <FitnessCard className="text-center py-8 mb-4">
      <Apple className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
      <h2 className="text-lg font-bold mb-2">Em desenvolvimento</h2>
      <p className="text-sm text-slate-400 max-w-xs mx-auto">
        Em breve você poderá registrar suas refeições, controlar macros e seguir um plano gerado pela IA.
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-fuchsia-300">
        <Sparkles className="w-3.5 h-3.5" /> Próxima fase
      </div>
    </FitnessCard>

    <div className="grid grid-cols-3 gap-2.5">
      {[
        { icon: Coffee, label: 'Café da manhã', color: 'text-amber-300' },
        { icon: Utensils, label: 'Almoço', color: 'text-orange-300' },
        { icon: Salad, label: 'Jantar', color: 'text-emerald-300' },
      ].map(({ icon: Icon, label, color }) => (
        <FitnessCard key={label} className="text-center opacity-60">
          <Icon className={`w-6 h-6 mx-auto mb-1.5 ${color}`} />
          <p className="text-[11px] font-medium">{label}</p>
          <p className="text-[9px] text-slate-500 mt-0.5">em breve</p>
        </FitnessCard>
      ))}
    </div>
  </FitnessLayout>
);

export default FitnessAlimentacao;
