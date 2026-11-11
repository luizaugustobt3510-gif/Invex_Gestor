import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, CalendarCheck, Dumbbell, Wallet, Download, Smartphone, ShieldCheck, Menu, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PublicCommerceFooter } from '@/components/PublicCommerceFooter';
import { AppDownload, PRODUTOS, downloadApp, formatSize } from '@/lib/appDownloads';
import { toast } from 'sonner';
import logo from '@/assets/invex-logo.png';

const PRODUCTS = [
  { key: 'gestor', icon: Boxes, name: 'Invex Gestor', tag: 'Para empresas', desc: 'Estoque, financeiro, pessoas e clínica em um só lugar.', bullets: ['Módulos sob medida', 'Acesso por perfil', 'Relatórios e PDFs'], to: '/login', cta: 'Entrar no Gestor', tone: 'bg-inv-leaf' },
  { key: 'rotina', icon: CalendarCheck, name: 'Invex Rotina', tag: 'Produtividade', desc: 'Tarefas, hábitos, metas e lembretes do seu dia.', bullets: ['Grátis para começar', 'Pomodoro e rituais', 'Premium R$ 25,90/mês'], to: '/rotina/entrar', cta: 'Entrar no Rotina', tone: 'bg-inv-orange' },
  { key: 'fitness', icon: Dumbbell, name: 'Invex Fitness', tag: 'Saúde', desc: 'Treinos guiados, cargas, descanso e metas diárias.', bullets: ['Modo treino ao vivo', 'Mapa muscular', 'Premium R$ 25,90/mês'], to: '/fitness/login', cta: 'Entrar no Fitness', tone: 'bg-inv-blue' },
  { key: 'financas', icon: Wallet, name: 'Invex Finanças', tag: 'Dinheiro pessoal', desc: 'Contas, teto de gastos, calendário e projeções.', bullets: ['Marcar pago em 1 toque', 'DRE pessoal', 'Premium R$ 25,90/mês'], to: '/financeiro/pessoal/entrar', cta: 'Entrar no Finanças', tone: 'bg-inv-teal' },
];

const Institucional = () => {
  const [apps, setApps] = useState<AppDownload[]>([]);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    document.title = 'Invex | Gestor, Rotina, Fitness e Finanças';
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'Conheça os apps Invex: Gestor para empresas, Rotina, Fitness e Finanças pessoais. Entre ou baixe o app para Android.');
    supabase.from('app_downloads').select('*').eq('ativo', true).order('ordem').then(({ data }) => setApps((data as AppDownload[]) ?? []));
  }, []);

  const baixar = async (d: AppDownload) => {
    try { await downloadApp(d); } catch { toast.error('Não foi possível baixar agora.'); }
  };

  const nav = [{ href: '#produtos', label: 'Produtos' }, { href: '#download', label: 'Download' }];

  return (
    <div className="inv-site min-h-[100dvh] antialiased">
      <header className="sticky top-0 z-50 border-b border-inv-line/70 bg-inv-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-5">
          <a href="#topo" className="flex items-center gap-2"><img src={logo} alt="Invex" className="h-8 w-auto" /></a>
          <nav className="hidden items-center gap-6 sm:flex">
            {nav.map((n) => <a key={n.href} href={n.href} className="text-sm text-inv-ink-soft hover:text-inv-ink">{n.label}</a>)}
            <Link to="/precos" className="text-sm text-inv-ink-soft hover:text-inv-ink">Preços</Link>
          </nav>
          <button className="rounded-lg border border-inv-line p-2 sm:hidden" onClick={() => setMenu(!menu)} aria-label="Menu">
            {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menu && (
          <div className="flex flex-col gap-3 border-t border-inv-line px-4 py-3 sm:hidden">
            {nav.map((n) => <a key={n.href} href={n.href} onClick={() => setMenu(false)} className="text-sm">{n.label}</a>)}
            <Link to="/precos" className="text-sm">Preços</Link>
          </div>
        )}
      </header>

      <section id="topo" className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 inv-aurora" />
        <div className="relative mx-auto max-w-3xl px-4 pb-10 pt-12 text-center sm:pt-16">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">Um app Invex para cada parte da sua vida.</h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-inv-ink-soft sm:text-lg">Empresa, rotina, treino e dinheiro — simples, seguro e no seu celular.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#produtos" className="inline-flex items-center justify-center gap-2 rounded-full bg-inv-ink px-6 py-3 text-sm font-medium text-inv-paper">Ver produtos <ArrowRight className="h-4 w-4" /></a>
            <a href="#download" className="inline-flex items-center justify-center gap-2 rounded-full border border-inv-line bg-inv-paper px-6 py-3 text-sm font-medium"><Download className="h-4 w-4" /> Baixar app</a>
          </div>
        </div>
      </section>

      <section id="produtos" className="mx-auto max-w-6xl px-4 pb-14 sm:px-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p) => (
            <article key={p.key} className="flex flex-col rounded-2xl border border-inv-line bg-inv-paper p-5 shadow-card transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${p.tone} text-primary-foreground`}><p.icon className="h-5 w-5" /></span>
                <div>
                  <h2 className="font-semibold leading-tight">{p.name}</h2>
                  <p className="text-xs text-inv-ink-soft">{p.tag}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-inv-ink-soft">{p.desc}</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {p.bullets.map((b) => <li key={b} className="flex gap-2"><span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${p.tone}`} />{b}</li>)}
              </ul>
              <Link to={p.to} className={`mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl ${p.tone} text-sm font-medium text-primary-foreground`}>
                {p.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="download" className="border-y border-inv-line bg-inv-paper/60 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-5">
          <div className="text-center">
            <Smartphone className="mx-auto h-8 w-8 text-inv-leaf" />
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Baixe para Android</h2>
            <p className="mt-2 text-sm text-inv-ink-soft">Instale o APK no seu celular ou tablet. Pode ser preciso permitir "instalar de fontes desconhecidas".</p>
          </div>
          <div className="mt-6 grid gap-3">
            {apps.length === 0 && <p className="rounded-xl border border-dashed border-inv-line p-6 text-center text-sm text-inv-ink-soft">Em breve os aplicativos estarão disponíveis aqui.</p>}
            {apps.map((a) => (
              <div key={a.id} className="flex flex-col gap-3 rounded-xl border border-inv-line bg-inv-paper p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-medium">{a.titulo} {a.versao && <span className="text-xs text-inv-ink-soft">v{a.versao}</span>}</p>
                  <p className="text-xs text-inv-ink-soft">{PRODUTOS[a.produto] ?? a.produto}{a.file_size ? ` · ${formatSize(a.file_size)}` : ''}</p>
                  {a.descricao && <p className="mt-1 text-sm text-inv-ink-soft">{a.descricao}</p>}
                </div>
                <button onClick={() => baixar(a)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-inv-ink px-5 text-sm font-medium text-inv-paper">
                  <Download className="h-4 w-4" /> Baixar APK
                </button>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-inv-ink-soft"><ShieldCheck className="h-4 w-4 text-inv-leaf" /> Arquivos oficiais Invex</p>
        </div>
      </section>

      <PublicCommerceFooter />
    </div>
  );
};

export default Institucional;
