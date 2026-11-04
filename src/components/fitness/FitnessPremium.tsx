import { ReactNode, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Crown, Lock, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FitnessLayout } from './FitnessLayout';
import { FitnessCard } from './FitnessCard';
import { useFitnessPremium } from '@/hooks/useFitnessPremium';
import { getPaddleEnvironment, openPremiumCheckout } from '@/lib/paddle';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';

export const FITNESS_PREMIUM_FEATURES = [
  'Gerar treino inteligente',
  'Gráficos de evolução',
  'Plano de alimentação',
  'Processo de emagrecimento sem limite',
  'Medalhas exclusivas + medalha Membro Premium',
];

/** Bloqueia a tela para quem não é Premium (o banco também bloqueia os dados). */
export const FitnessPremiumRoute = ({ children, feature }: { children: ReactNode; feature: string }) => {
  const { premium, loading } = useFitnessPremium();
  if (loading) return <FitnessLayout><div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-cyan-300" /></div></FitnessLayout>;
  if (premium) return <>{children}</>;
  return (
    <FitnessLayout>
      <FitnessCard glow="fuchsia" className="mt-6 text-center">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-14 h-14 rounded-2xl bg-fuchsia-500/20 flex items-center justify-center"><Lock className="w-7 h-7 text-fuchsia-300" /></div>
          <h1 className="text-lg font-black">{feature} é Premium</h1>
          <p className="text-sm text-slate-400 max-w-xs">Assine o Invex Fitness Premium para liberar este recurso. São 3 dias grátis.</p>
          <Link to="/fitness/perfil#plano" className="mt-2 h-11 px-6 rounded-xl font-bold text-slate-900 flex items-center gap-2" style={{ background: 'linear-gradient(90deg,#e879f9,#22d3ee)' }}>
            <Crown className="w-4 h-4" /> Ver planos
          </Link>
        </div>
      </FitnessCard>
    </FitnessLayout>
  );
};

/** Gestão do plano no Perfil: assinar, ver status e gerenciar. */
export const FitnessPlanCard = () => {
  const { premium, sub, refresh } = useFitnessPremium();
  const [params, setParams] = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (params.get('checkout') !== 'sucesso') return;
    toast.success('Pagamento recebido! Liberando seu Premium...');
    params.delete('checkout'); setParams(params, { replace: true });
    let n = 0;
    const t = setInterval(async () => { n++; if ((await refresh()) || n >= 10) clearInterval(t); }, 3000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const subscribe = async (priceId: string) => {
    setBusy(priceId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error();
      await openPremiumCheckout({ priceId, userId: user.id, email: user.email || undefined, successPath: '/fitness/perfil' });
    } catch { toast.error('Não foi possível abrir o pagamento.'); }
    setBusy(null);
  };

  const manage = async () => {
    setBusy('portal');
    const { data, error } = await supabase.functions.invoke('rotina-portal', { body: { environment: getPaddleEnvironment(), product: 'fitness_premium' } });
    setBusy(null);
    if (error || !data?.url) return toast.error('Não foi possível abrir a gestão da assinatura.');
    window.open(data.url, '_blank');
  };

  const fim = sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pt-BR') : null;

  return (
    <FitnessCard id="plano" glow="fuchsia" className="mb-4">
      <PaymentTestModeBanner />
      <div className="flex items-center gap-2 mb-2 mt-2">
        <Crown className="w-4 h-4 text-fuchsia-300" />
        <span className="text-sm font-semibold">Plano: {premium ? 'Premium' : 'Gratuito'}</span>
      </div>
      {sub && fim && (
        <p className="text-xs text-slate-400 mb-2">
          {sub.status === 'canceled' || sub.cancel_at_period_end ? `Cancelada — Premium até ${fim}` : sub.status === 'trialing' ? `Primeira cobrança em ${fim}` : `Renova em ${fim}`}
        </p>
      )}
      <ul className="space-y-1 mb-3">
        {FITNESS_PREMIUM_FEATURES.map(f => (
          <li key={f} className="text-xs text-slate-300 flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-300" />{f}</li>
        ))}
      </ul>
      {sub ? (
        <button onClick={manage} disabled={!!busy} className="w-full h-11 rounded-xl border border-slate-600 text-sm font-semibold">
          {busy === 'portal' ? 'Abrindo...' : 'Gerenciar assinatura'}
        </button>
      ) : !premium ? (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => subscribe('fitness_premium_mensal')} disabled={!!busy} className="h-14 rounded-xl font-bold text-slate-900 text-sm" style={{ background: 'linear-gradient(90deg,#e879f9,#22d3ee)' }}>
            {busy === 'fitness_premium_mensal' ? '...' : <>R$ 25,90<span className="block text-[10px] font-normal">por mês</span></>}
          </button>
          <button onClick={() => subscribe('fitness_premium_anual')} disabled={!!busy} className="h-14 rounded-xl font-bold text-sm border border-fuchsia-400/60 text-fuchsia-200">
            {busy === 'fitness_premium_anual' ? '...' : <>R$ 259,00<span className="block text-[10px] font-normal">por ano</span></>}
          </button>
          <p className="col-span-2 text-[10px] text-slate-500 text-center">3 dias grátis. Cancele quando quiser; o Premium vale até o fim do período pago.</p>
        </div>
      ) : (
        <p className="text-xs text-cyan-300">Premium liberado pelo administrador.</p>
      )}
    </FitnessCard>
  );
};
