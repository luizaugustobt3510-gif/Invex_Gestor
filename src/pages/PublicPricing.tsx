import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicPageLayout } from './PublicPolicies';
import { FREE_LIMITS } from '@/lib/rotinaPlan';
import { formatBRL, ROTINA_MONTHLY_CENTS, ROTINA_ANNUAL_CENTS } from '@/lib/publicCommerce';
import { FINANCAS_MONTHLY_CENTS, FINANCAS_ANNUAL_CENTS, FINANCAS_FREE_FEATURES, FINANCAS_PREMIUM_FEATURES, FINANCAS_TRIAL_DAYS } from '@/lib/financas/plan';

export default function PublicPricing() {
  const plans = [
    { name: 'Gratuito', price: 'R$ 0', period: 'sem mensalidade', features: ['Tarefas e organização diária', `Até ${FREE_LIMITS.habitos} hábitos`, `Até ${FREE_LIMITS.metas} metas`, 'Notas e lembretes'], action: 'Começar grátis' },
    { name: 'Premium mensal', price: formatBRL(ROTINA_MONTHLY_CENTS), period: 'por mês', features: ['Tudo do Gratuito', 'Hábitos e metas ilimitados', 'Gráficos e revisão semanal', 'Foco Pomodoro e rituais', 'Relatório semanal em PDF'], action: 'Escolher mensal' },
    { name: 'Premium anual', price: formatBRL(ROTINA_ANNUAL_CENTS), period: 'por ano · cobrança anual', features: ['Todos os recursos Premium', 'Uma cobrança por ano', 'Economia em relação a 12 mensalidades'], action: 'Escolher anual' },
  ];
  const financasPlans = [
    { name: 'Gratuito', price: 'R$ 0', period: 'sem mensalidade', features: [...FINANCAS_FREE_FEATURES], action: 'Começar grátis' },
    { name: 'Premium mensal', price: formatBRL(FINANCAS_MONTHLY_CENTS), period: `por mês · ${FINANCAS_TRIAL_DAYS} dias grátis`, features: ['Tudo do Gratuito', ...FINANCAS_PREMIUM_FEATURES], action: 'Escolher mensal' },
    { name: 'Premium anual', price: formatBRL(FINANCAS_ANNUAL_CENTS), period: `por ano · ${FINANCAS_TRIAL_DAYS} dias grátis`, features: ['Todos os recursos Premium', 'Uma cobrança por ano', 'Economia em relação a 12 mensalidades'], action: 'Escolher anual' },
  ];
  return (
    <PublicPageLayout title="Preços — Invex Rotina e Invex Finanças">
      <h1 className="text-3xl font-semibold">Invex Rotina</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">Organização pessoal de tarefas, hábitos e metas. Escolha o plano que acompanha sua rotina.</p>
      <div className="mt-9 grid gap-5 md:grid-cols-3">
        {plans.map(plan => <section key={plan.name} className="flex flex-col rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">{plan.name}</h2>
          <p className="mt-5 text-3xl font-semibold">{plan.price}</p><p className="mt-1 text-sm text-muted-foreground">{plan.period}</p>
          <ul className="my-6 flex-1 space-y-3 text-sm">{plan.features.map(feature => <li className="flex gap-2" key={feature}><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{feature}</span></li>)}</ul>
          <Button asChild variant={plan.name === 'Gratuito' ? 'outline' : 'default'} className="h-11"><Link to="/rotina/entrar">{plan.action}</Link></Button>
        </section>)}
      </div>
      <h2 className="mt-14 text-3xl font-semibold">Invex Finanças</h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">Finanças pessoais: saiba quanto ainda pode gastar no mês, controle parcelas e contas a pagar.</p>
      <div className="mt-9 grid gap-5 md:grid-cols-3">
        {financasPlans.map(plan => <section key={plan.name} className="flex flex-col rounded-lg border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="mt-5 text-3xl font-semibold">{plan.price}</p><p className="mt-1 text-sm text-muted-foreground">{plan.period}</p>
          <ul className="my-6 flex-1 space-y-3 text-sm">{plan.features.map(feature => <li className="flex gap-2" key={feature}><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{feature}</span></li>)}</ul>
          <Button asChild variant={plan.name === 'Gratuito' ? 'outline' : 'default'} className="h-11"><Link to="/financeiro/pessoal/entrar">{plan.action}</Link></Button>
        </section>)}
      </div>
      <section className="mt-9 max-w-3xl space-y-3 text-sm leading-6 text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">Cobrança e cancelamento</h2>
        <p>As assinaturas são processadas pela Paddle, Merchant of Record. A periodicidade, o total, os tributos aplicáveis e qualquer teste gratuito disponível são apresentados antes da confirmação no checkout.</p>
        <p>A renovação é automática até o cancelamento. Gerencie a assinatura em Perfil → Gestão do plano. Ao cancelar, você mantém o Premium até o fim do período já pago; seus dados não são apagados automaticamente. Reembolsos seguem a <Link className="text-primary underline" to="/reembolso">Política de Reembolso</Link>.</p>
        <p>Cada assinatura vale só para o seu produto (Invex Rotina ou Invex Finanças) e não inclui os módulos empresariais do Invex Gestor.</p>
      </section>
    </PublicPageLayout>
  );
}