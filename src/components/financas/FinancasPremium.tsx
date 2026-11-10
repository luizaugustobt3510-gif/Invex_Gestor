import { ReactNode, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Crown, Lock, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { getPaddleEnvironment, openPremiumCheckout } from '@/lib/paddle';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';
import {
  FINANCAS_PREMIUM_FEATURES, FINANCAS_MONTHLY_PRICE_ID, FINANCAS_ANNUAL_PRICE_ID,
  FINANCAS_MONTHLY_CENTS, FINANCAS_ANNUAL_CENTS, FINANCAS_TRIAL_DAYS,
} from '@/lib/financas/plan';
import { formatBRL } from '@/lib/publicCommerce';
import type { FinancasSub } from '@/hooks/useFinancasPremium';

/** Cartão que aparece no lugar de um recurso Premium para quem está no Gratuito. */
export function PremiumLock({ feature, onSeePlans, children }: { feature: string; onSeePlans: () => void; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 to-accent/40 p-6 text-center shadow-[var(--shadow-card)]">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Lock className="h-6 w-6" /></div>
      <h3 className="text-base font-semibold">{feature} é Premium</h3>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
        Assine o Invex Finanças Premium para liberar. São {FINANCAS_TRIAL_DAYS} dias grátis.
      </p>
      {children}
      <Button className="mt-4 h-11" onClick={onSeePlans}><Crown className="mr-2 h-4 w-4" />Ver planos</Button>
    </div>
  );
}

/** Gestão do plano no Perfil: assinar, ver status e gerenciar. */
export function FinancasPlanCard({ premium, sub, refresh }: { premium: boolean; sub: FinancasSub | null; refresh: () => Promise<boolean> }) {
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
      await openPremiumCheckout({ priceId, userId: user.id, email: user.email || undefined, successPath: '/financeiro/pessoal' });
    } catch { toast.error('Não foi possível abrir o pagamento.'); }
    setBusy(null);
  };

  const manage = async () => {
    setBusy('portal');
    const { data, error } = await supabase.functions.invoke('rotina-portal', { body: { environment: getPaddleEnvironment(), product: 'financas_premium' } });
    setBusy(null);
    if (error || !data?.url) return toast.error('Não foi possível abrir a gestão da assinatura.');
    window.open(data.url, '_blank');
  };

  const fim = sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pt-BR') : null;

  return (
    <div id="plano" className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <PaymentTestModeBanner />
      <div className="mb-2 mt-2 flex items-center gap-2">
        <Crown className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Plano: {premium ? 'Premium' : 'Gratuito'}</span>
      </div>
      {sub && fim && (
        <p className="mb-2 text-xs text-muted-foreground">
          {sub.status === 'canceled' || sub.cancel_at_period_end ? `Cancelada — Premium até ${fim}` : sub.status === 'trialing' ? `Primeira cobrança em ${fim}` : `Renova em ${fim}`}
        </p>
      )}
      <ul className="mb-3 space-y-1">
        {FINANCAS_PREMIUM_FEATURES.map(f => (
          <li key={f} className="flex items-center gap-2 text-xs"><Check className="h-3.5 w-3.5 text-income" />{f}</li>
        ))}
      </ul>
      {sub ? (
        <Button variant="outline" className="h-11 w-full" onClick={manage} disabled={!!busy}>
          {busy === 'portal' ? 'Abrindo...' : 'Gerenciar assinatura (trocar plano, cartão ou cancelar)'}
        </Button>
      ) : !premium ? (
        <div className="grid grid-cols-2 gap-2">
          <Button className="h-14 flex-col" onClick={() => subscribe(FINANCAS_MONTHLY_PRICE_ID)} disabled={!!busy}>
            {busy === FINANCAS_MONTHLY_PRICE_ID ? '...' : <><span className="font-bold">{formatBRL(FINANCAS_MONTHLY_CENTS)}</span><span className="text-[10px] font-normal">por mês</span></>}
          </Button>
          <Button variant="outline" className="h-14 flex-col border-primary/40" onClick={() => subscribe(FINANCAS_ANNUAL_PRICE_ID)} disabled={!!busy}>
            {busy === FINANCAS_ANNUAL_PRICE_ID ? '...' : <><span className="font-bold">{formatBRL(FINANCAS_ANNUAL_CENTS)}</span><span className="text-[10px] font-normal">por ano</span></>}
          </Button>
          <p className="col-span-2 text-center text-[10px] text-muted-foreground">{FINANCAS_TRIAL_DAYS} dias grátis. Cancele quando quiser; o Premium vale até o fim do período pago.</p>
        </div>
      ) : (
        <p className="text-xs text-income">Premium liberado pelo administrador.</p>
      )}
    </div>
  );
}
