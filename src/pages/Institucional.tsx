import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Boxes, Wallet, Users, ClipboardList, FileSignature, Send,
  LayoutDashboard, Leaf, FileText, ScanLine, Sparkles, Check, ShieldCheck,
  Smartphone, Zap, BarChart3, Menu, X,
} from 'lucide-react';

/* ---------------- reveal on scroll ---------------- */
const useReveal = () => {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.inv-reveal'));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('inv-in')),
      { threshold: 0.05, rootMargin: '0px 0px -60px 0px' },
    );
    els.forEach((el) => io.observe(el));
    const fallback = window.setTimeout(() => els.forEach((el) => el.classList.add('inv-in')), 1500);
    return () => { io.disconnect(); window.clearTimeout(fallback); };
  }, []);
};

const Reveal = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <div className={`inv-reveal ${className}`} style={{ animationDelay: `${delay}ms` }}>
    {children}
  </div>
);

/* ---------------- decorative organic svg ---------------- */
const RootLines = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 600 300" fill="none" className={className} aria-hidden="true">
    <path className="inv-draw" d="M20 280 C 160 280, 180 160, 300 150 C 420 140, 440 40, 580 30"
      stroke="hsl(var(--inv-leaf))" strokeOpacity=".45" strokeWidth="1.5" />
    <path className="inv-draw" d="M20 280 C 150 250, 220 240, 300 190 C 380 140, 480 130, 580 120"
      stroke="hsl(var(--inv-glow))" strokeOpacity=".35" strokeWidth="1.5" />
    <path className="inv-draw" d="M20 280 C 120 270, 200 280, 300 250 C 420 215, 470 200, 580 205"
      stroke="hsl(var(--inv-ink))" strokeOpacity=".15" strokeWidth="1.5" />
    {[[300, 150], [580, 30], [300, 190], [580, 120], [300, 250]].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="4" fill="hsl(var(--inv-leaf))" fillOpacity=".7" />
    ))}
  </svg>
);

/* ---------------- data ---------------- */
const MODULES = [
  { icon: Boxes, name: 'Estoque', desc: 'Entradas, saídas, curva ABC, itens críticos e rastreio por QR Code.' },
  { icon: Wallet, name: 'Financeiro', desc: 'Lançamentos, vencimentos, DRE, centros de custo e conciliação.' },
  { icon: Users, name: 'Gestão de Pessoas', desc: 'Colaboradores, ASO, treinamentos, férias e indicadores.' },
  { icon: ClipboardList, name: 'Anamnese', desc: 'Questionários digitais guiados, condicionais e prontos para tablet.' },
  { icon: FileSignature, name: 'Receituário', desc: 'Prescrições rápidas, assinatura digital e documento pronto em segundos.' },
  { icon: Send, name: 'Solicitações', desc: 'Pedidos entre setores com aprovação, entrega e baixa automática.' },
  { icon: LayoutDashboard, name: 'Gestão', desc: 'Perfis, permissões por módulo e visão consolidada da operação.' },
];

const JOURNEY = [
  { icon: FileText, tag: '01', title: 'Papel', text: 'Formulários, fichas e planilhas soltas em armários e gavetas.' },
  { icon: X, tag: '02', title: 'Desperdício', text: 'Retrabalho, extravio de documentos e informação que ninguém encontra.' },
  { icon: ScanLine, tag: '03', title: 'Digitalização', text: 'Processos viram fluxos digitais, assinados e registrados na hora.' },
  { icon: Boxes, tag: '04', title: 'Organização', text: 'Tudo centralizado, com histórico, permissões e busca imediata.' },
  { icon: Zap, tag: '05', title: 'Eficiência', text: 'Decisões apoiadas em dados reais, no computador ou no celular.' },
];

const PLANS = [
  {
    name: 'Essencial', price: 'Sob consulta', note: 'Para começar a digitalizar',
    features: ['Até 2 módulos', 'Usuários e perfis', 'Suporte por e-mail', 'Atualizações inclusas'],
  },
  {
    name: 'Profissional', price: 'Sob consulta', note: 'O mais escolhido', highlight: true,
    features: ['Módulos combinados', 'Documentos digitais e assinaturas', 'Dashboards e indicadores', 'Suporte prioritário'],
  },
  {
    name: 'Corporativo', price: 'Sob consulta', note: 'Multiunidades e alto volume',
    features: ['Todos os módulos', 'Múltiplas empresas e setores', 'Integrações sob medida', 'Acompanhamento dedicado'],
  },
];

const IMPACT = [
  { label: 'Documentos digitalizados', unit: 'documentos', hint: 'Contabilizado a partir dos registros da sua operação.' },
  { label: 'Folhas de papel evitadas', unit: 'folhas', hint: 'Estimado com base nos documentos emitidos no sistema.' },
  { label: 'Processos automatizados', unit: 'fluxos', hint: 'Fluxos que deixaram de exigir formulário impresso.' },
];

/* ---------------- page ---------------- */
const Institucional = () => {
  useReveal();
  const [menuOpen, setMenuOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = 'INVEX | Menos papel. Mais gestão.';
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute(
      'content',
      'INVEX é o sistema de gestão inteligente que digitaliza processos, centraliza informações e reduz a dependência de papel. Conheça os módulos e solicite uma demonstração.',
    );
  }, []);

  const nav = [
    { href: '#modulos', label: 'Módulos' },
    { href: '#transformacao', label: 'Transformação' },
    { href: '#impacto', label: 'Impacto' },
    { href: '#planos', label: 'Planos' },
  ];

  return (
    <div className="inv-site min-h-screen antialiased selection:bg-inv-leaf/20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'INVEX',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web, Android, iOS',
            description: 'Sistema de gestão inteligente para digitalizar processos e reduzir o uso de papel.',
            url: 'https://invexgestor.site/institucional',
          }),
        }}
      />

      {/* ---------- header ---------- */}
      <header className="sticky top-0 z-50 border-b border-inv-line/70 bg-inv-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#topo" className="flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-inv-ink">
              <Leaf className="h-4.5 w-4.5 text-inv-leaf-soft" strokeWidth={2.2} />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-tight">INVEX</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-inv-ink-soft">Gestor</span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="text-sm text-inv-ink-soft transition-colors hover:text-inv-ink">
                {n.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className="text-sm text-inv-ink-soft transition-colors hover:text-inv-ink">Entrar</Link>
            <a href="#demonstracao" className="rounded-full bg-inv-ink px-4 py-2 text-sm font-medium text-inv-paper transition-transform hover:-translate-y-0.5">
              Solicitar demonstração
            </a>
          </div>

          <button
            className="md:hidden rounded-lg border border-inv-line p-2"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-inv-line bg-inv-paper px-5 py-4 md:hidden">
            <div className="flex flex-col gap-4">
              {nav.map((n) => (
                <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="text-sm text-inv-ink-soft">
                  {n.label}
                </a>
              ))}
              <Link to="/login" className="text-sm text-inv-ink-soft">Entrar</Link>
              <a href="#demonstracao" onClick={() => setMenuOpen(false)}
                className="rounded-full bg-inv-ink px-4 py-2.5 text-center text-sm font-medium text-inv-paper">
                Solicitar demonstração
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ---------- hero ---------- */}
      <section id="topo" className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 inv-aurora" />
        <div className="pointer-events-none absolute inset-0 inv-grid-bg opacity-70" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:pb-32 lg:pt-28">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-inv-line bg-white/70 px-3 py-1.5 text-xs font-medium text-inv-ink-soft">
                <Sparkles className="h-3.5 w-3.5 text-inv-leaf" />
                Menos papel, mais gestão
              </span>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-6 text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl">
                O sistema que troca<br />
                <span className="relative inline-block">
                  <span className="relative z-10">gavetas de papel</span>
                  <span className="absolute inset-x-0 bottom-1 z-0 h-3 bg-inv-leaf-soft/30" />
                </span>
                <br />por decisões claras.
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-inv-ink-soft sm:text-lg">
                O INVEX digitaliza processos, centraliza informações e organiza a operação inteira —
                estoque, financeiro, pessoas e atendimento — em uma única plataforma feita para durar.
              </p>
            </Reveal>
            <Reveal delay={260}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#modulos"
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-inv-ink px-6 py-3.5 text-sm font-medium text-inv-paper shadow-[0_18px_40px_-22px_hsl(var(--inv-ink))] transition-transform hover:-translate-y-0.5">
                  Conheça o INVEX
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <a href="#demonstracao"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-inv-line bg-white/70 px-6 py-3.5 text-sm font-medium text-inv-ink transition-colors hover:border-inv-leaf/40">
                  Ver demonstração
                </a>
              </div>
            </Reveal>
            <Reveal delay={340}>
              <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs text-inv-ink-soft">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-inv-leaf" /> Acessos por perfil</span>
                <span className="inline-flex items-center gap-2"><Smartphone className="h-4 w-4 text-inv-leaf" /> Celular e tablet</span>
                <span className="inline-flex items-center gap-2"><BarChart3 className="h-4 w-4 text-inv-leaf" /> Indicadores em tempo real</span>
              </div>
            </Reveal>
          </div>

          {/* product mock */}
          <Reveal delay={200} className="relative">
            <div className="inv-float relative">
              <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-inv-leaf-soft/25 via-transparent to-inv-glow/20 blur-2xl" />
              <ProductMock />
            </div>
          </Reveal>
        </div>
        <RootLines className="pointer-events-none absolute bottom-0 left-0 h-40 w-full inv-in opacity-70" />
      </section>

      {/* ---------- transformação ---------- */}
      <section id="transformacao" className="relative border-y border-inv-line bg-white/50 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-inv-leaf">A transformação</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Do arquivo morto ao fluxo vivo de informação
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-4 md:grid-cols-5">
            {JOURNEY.map((s, i) => (
              <Reveal key={s.title} delay={i * 90}>
                <div className="inv-card group h-full rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-inv-ink/5">
                      <s.icon className="h-4.5 w-4.5 text-inv-ink" strokeWidth={1.8} />
                    </span>
                    <span className="text-[11px] font-medium tracking-widest text-inv-ink-soft/70">{s.tag}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-inv-ink-soft">{s.text}</p>
                  <div className="mt-5 h-px w-full bg-inv-line">
                    <div className="h-px bg-inv-leaf transition-all duration-700 group-hover:w-full" style={{ width: `${(i + 1) * 20}%` }} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- módulos ---------- */}
      <section id="modulos" className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-inv-leaf">Módulos</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Um sistema modular: ative apenas o que a sua operação precisa
            </h2>
            <p className="mt-4 max-w-2xl text-inv-ink-soft">
              Cada módulo funciona sozinho e conversa com os demais. Comece por um, cresça sem migrar de plataforma.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m, i) => (
              <Reveal key={m.name} delay={i * 70}>
                <article className="inv-card h-full rounded-2xl p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-inv-leaf/10">
                    <m.icon className="h-5 w-5 text-inv-leaf" strokeWidth={1.8} />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{m.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-inv-ink-soft">{m.desc}</p>
                </article>
              </Reveal>
            ))}
            <Reveal delay={MODULES.length * 70}>
              <a href="#demonstracao"
                className="inv-card flex h-full flex-col justify-between rounded-2xl bg-inv-ink/[0.03] p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-inv-ink text-inv-paper">
                  <ArrowRight className="h-5 w-5" />
                </span>
                <div className="mt-5">
                  <h3 className="text-lg font-semibold tracking-tight">Precisa de outro fluxo?</h3>
                  <p className="mt-2 text-sm text-inv-ink-soft">Fale com o time e avaliamos o módulo ideal para o seu processo.</p>
                </div>
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- menos papel ---------- */}
      <section className="relative overflow-hidden bg-inv-ink py-24 text-inv-paper">
        <div className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{ background: 'radial-gradient(50% 60% at 80% 20%, hsl(var(--inv-glow) / .5), transparent 60%), radial-gradient(45% 55% at 10% 80%, hsl(var(--inv-leaf-soft) / .45), transparent 60%)' }} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-inv-leaf-soft">Sustentabilidade prática</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-[2.6rem]">
              Menos papel.<br />Mais inteligência.
            </h2>
            <p className="mt-5 max-w-lg leading-relaxed text-inv-paper/70">
              Cada ficha impressa é uma informação que fica presa. No INVEX, o documento nasce digital:
              é preenchido no tablet, assinado na tela, arquivado com histórico e encontrado em segundos.
              O resultado é uma operação mais enxuta — e um consumo de papel muito menor.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-inv-paper/80">
              {[
                'Formulários, anamneses e receituários 100% digitais',
                'Assinatura eletrônica com trilha de auditoria',
                'PDFs leves, prontos para enviar sem imprimir',
                'Busca instantânea no lugar do arquivo físico',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-inv-leaf-soft" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={140}>
            <PaperToPixel />
          </Reveal>
        </div>
      </section>

      {/* ---------- impacto (placeholders, sem números inventados) ---------- */}
      <section id="impacto" className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-inv-leaf">Indicadores</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Impacto medido com os seus dados — não com estimativas genéricas
            </h2>
            <p className="mt-4 max-w-2xl text-inv-ink-soft">
              Estes painéis são alimentados pela operação real da sua empresa dentro do INVEX.
              Enquanto não houver histórico suficiente, eles permanecem aguardando dados.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {IMPACT.map((m, i) => (
              <Reveal key={m.label} delay={i * 90}>
                <div className="inv-card h-full rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{m.label}</p>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-inv-leaf/50"
                        style={{ animation: 'inv-pulse-ring 2.4s ease-out infinite' }} />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-inv-leaf" />
                    </span>
                  </div>
                  <p className="mt-6 text-4xl font-semibold tracking-tight text-inv-ink/25">—</p>
                  <p className="text-xs uppercase tracking-widest text-inv-ink-soft/70">{m.unit}</p>
                  <p className="mt-4 text-xs leading-relaxed text-inv-ink-soft">{m.hint}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- como digitalizamos ---------- */}
      <section className="border-y border-inv-line bg-white/50 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-inv-leaf">Como funciona</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Como o INVEX digitaliza os seus processos
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {[
              { n: '01', t: 'Mapeamos o processo', d: 'Entendemos quais documentos circulam em papel e onde a informação se perde.' },
              { n: '02', t: 'Configuramos os módulos', d: 'Ativamos apenas o necessário, com perfis e permissões por setor.' },
              { n: '03', t: 'Migramos e treinamos', d: 'Importação de cadastros, modelos de formulários e treinamento da equipe.' },
              { n: '04', t: 'Acompanhamos resultados', d: 'Painéis mostram gargalos, consumo e desempenho para ajustes contínuos.' },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="relative pl-6">
                  <span className="absolute left-0 top-1.5 h-full w-px bg-inv-line">
                    <span className="absolute -left-[3px] top-0 h-1.5 w-1.5 rounded-full bg-inv-leaf" />
                  </span>
                  <span className="text-xs font-semibold tracking-widest text-inv-ink-soft/70">{s.n}</span>
                  <h3 className="mt-2 text-base font-semibold">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-inv-ink-soft">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- planos ---------- */}
      <section id="planos" className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-inv-leaf">Planos</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Você paga pelos módulos que usa
            </h2>
            <p className="mt-4 max-w-2xl text-inv-ink-soft">
              O valor final depende dos módulos ativos, do número de usuários e das unidades atendidas.
              Fale com o time para um orçamento exato.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {PLANS.map((p, i) => (
              <Reveal key={p.name} delay={i * 90}>
                <div className={`inv-card relative flex h-full flex-col rounded-3xl p-7 ${p.highlight ? 'border-inv-leaf/40 bg-white' : ''}`}>
                  {p.highlight && (
                    <span className="absolute -top-3 left-7 rounded-full bg-inv-leaf px-3 py-1 text-[11px] font-medium text-white">
                      {p.note}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold tracking-tight">{p.name}</h3>
                  {!p.highlight && <p className="mt-1 text-sm text-inv-ink-soft">{p.note}</p>}
                  <p className="mt-6 text-2xl font-semibold tracking-tight">{p.price}</p>
                  <ul className="mt-6 flex-1 space-y-3 text-sm text-inv-ink-soft">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-inv-leaf" />{f}
                      </li>
                    ))}
                  </ul>
                  <a href="#demonstracao"
                    className={`mt-8 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5 ${
                      p.highlight ? 'bg-inv-ink text-inv-paper' : 'border border-inv-line bg-white/60 text-inv-ink'
                    }`}>
                    Falar com o time
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA / demonstração ---------- */}
      <section id="demonstracao" className="relative overflow-hidden py-24">
        <div className="pointer-events-none absolute inset-0 inv-aurora opacity-80" />
        <div className="relative mx-auto max-w-4xl px-5">
          <Reveal>
            <div className="inv-card rounded-[2rem] p-8 sm:p-12">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Solicite uma demonstração</h2>
              <p className="mt-3 max-w-xl text-inv-ink-soft">
                Mostramos o INVEX rodando com um cenário parecido com o da sua operação. Sem compromisso.
              </p>

              <form
                ref={formRef}
                className="mt-8 grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const msg = `Olá! Gostaria de uma demonstração do INVEX.%0A%0ANome: ${fd.get('nome')}%0AEmpresa: ${fd.get('empresa')}%0AE-mail: ${fd.get('email')}%0AInteresse: ${fd.get('interesse')}`;
                  setSent(true);
                  window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener');
                }}
              >
                {[
                  { name: 'nome', label: 'Seu nome', type: 'text', ph: 'Maria Silva' },
                  { name: 'empresa', label: 'Empresa', type: 'text', ph: 'Nome da empresa' },
                  { name: 'email', label: 'E-mail', type: 'email', ph: 'voce@empresa.com' },
                ].map((f) => (
                  <label key={f.name} className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">{f.label}</span>
                    <input
                      required name={f.name} type={f.type} placeholder={f.ph}
                      className="rounded-xl border border-inv-line bg-white/80 px-4 py-3 text-base outline-none transition-colors focus:border-inv-leaf"
                    />
                  </label>
                ))}
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">Interesse principal</span>
                  <select name="interesse"
                    className="rounded-xl border border-inv-line bg-white/80 px-4 py-3 text-base outline-none transition-colors focus:border-inv-leaf">
                    {MODULES.map((m) => <option key={m.name}>{m.name}</option>)}
                    <option>Ainda não sei</option>
                  </select>
                </label>
                <div className="sm:col-span-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <button type="submit"
                    className="group inline-flex items-center gap-2 rounded-full bg-inv-ink px-6 py-3.5 text-sm font-medium text-inv-paper transition-transform hover:-translate-y-0.5">
                    Quero a demonstração
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  {sent && <span className="text-sm text-inv-leaf">Abrimos o WhatsApp com sua mensagem pronta.</span>}
                </div>
              </form>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="border-t border-inv-line bg-white/60">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-inv-ink">
                  <Leaf className="h-4.5 w-4.5 text-inv-leaf-soft" strokeWidth={2.2} />
                </span>
                <span className="text-[15px] font-semibold tracking-tight">INVEX Gestor</span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-inv-ink-soft">
                Sistema de gestão inteligente e modular. Menos papel, mais gestão.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-inv-ink-soft/70">Produto</p>
              <ul className="mt-4 space-y-2.5 text-sm text-inv-ink-soft">
                <li><a href="#modulos" className="hover:text-inv-ink">Módulos</a></li>
                <li><a href="#planos" className="hover:text-inv-ink">Planos</a></li>
                <li><a href="#impacto" className="hover:text-inv-ink">Indicadores</a></li>
                <li><Link to="/login" className="hover:text-inv-ink">Entrar no sistema</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-inv-ink-soft/70">Contato</p>
              <ul className="mt-4 space-y-2.5 text-sm text-inv-ink-soft">
                <li><a href="#demonstracao" className="hover:text-inv-ink">Solicitar demonstração</a></li>
                <li><a href="https://invexgestor.site" className="hover:text-inv-ink">invexgestor.site</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-inv-line pt-6 text-xs text-inv-ink-soft sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} INVEX. Todos os direitos reservados.</span>
            <span>Feito para operações que querem menos papel.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

/* ---------------- mock do sistema ---------------- */
const ProductMock = () => (
  <div className="overflow-hidden rounded-2xl border border-inv-line bg-white shadow-[0_40px_80px_-50px_hsl(var(--inv-ink)/.55)]">
    <div className="flex items-center gap-2 border-b border-inv-line bg-inv-sand/50 px-4 py-3">
      <span className="h-2.5 w-2.5 rounded-full bg-inv-ink/15" />
      <span className="h-2.5 w-2.5 rounded-full bg-inv-ink/15" />
      <span className="h-2.5 w-2.5 rounded-full bg-inv-ink/15" />
      <span className="ml-3 text-[11px] text-inv-ink-soft">invexgestor.site · painel</span>
    </div>
    <div className="grid grid-cols-[68px_1fr] sm:grid-cols-[92px_1fr]">
      <aside className="space-y-3 border-r border-inv-line bg-inv-paper/70 p-3">
        {[Boxes, Wallet, Users, ClipboardList, LayoutDashboard].map((Icon, i) => (
          <div key={i} className={`flex h-9 items-center justify-center rounded-xl ${i === 0 ? 'bg-inv-leaf/12 text-inv-leaf' : 'text-inv-ink-soft/60'}`}>
            <Icon className="h-4 w-4" strokeWidth={1.8} />
          </div>
        ))}
      </aside>
      <div className="p-4 sm:p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-inv-ink-soft/70">Visão geral</p>
            <p className="text-sm font-semibold">Operação de hoje</p>
          </div>
          <span className="rounded-full bg-inv-leaf/10 px-2.5 py-1 text-[10px] font-medium text-inv-leaf">ao vivo</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {['Estoque', 'Solicitações', 'Documentos'].map((t, i) => (
            <div key={t} className="rounded-xl border border-inv-line bg-inv-paper/60 p-2.5">
              <p className="text-[10px] text-inv-ink-soft">{t}</p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-inv-line">
                <div className="h-1.5 rounded-full bg-inv-leaf/70" style={{ width: `${[72, 48, 88][i]}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-inv-line p-3">
          <svg viewBox="0 0 320 90" className="h-24 w-full" aria-hidden="true">
            <defs>
              <linearGradient id="invArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--inv-leaf))" stopOpacity=".28" />
                <stop offset="100%" stopColor="hsl(var(--inv-leaf))" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 72 L40 62 L80 66 L120 44 L160 50 L200 30 L240 34 L280 18 L320 22 L320 90 L0 90 Z" fill="url(#invArea)" />
            <path d="M0 72 L40 62 L80 66 L120 44 L160 50 L200 30 L240 34 L280 18 L320 22"
              fill="none" stroke="hsl(var(--inv-leaf))" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <div className="mt-3 space-y-2">
          {['Anamnese assinada digitalmente', 'Solicitação entregue ao setor', 'Receituário gerado em PDF'].map((t) => (
            <div key={t} className="flex items-center gap-2 rounded-lg bg-inv-paper/70 px-2.5 py-2 text-[11px] text-inv-ink-soft">
              <Check className="h-3.5 w-3.5 text-inv-leaf" />{t}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ---------------- papel → pixel ---------------- */
const PaperToPixel = () => (
  <div className="relative grid grid-cols-2 gap-5">
    <div className="rounded-2xl border border-inv-paper/15 bg-inv-paper/[0.06] p-5">
      <FileText className="h-5 w-5 text-inv-paper/50" strokeWidth={1.6} />
      <p className="mt-4 text-sm font-medium text-inv-paper/80">Antes</p>
      <div className="mt-4 space-y-2">
        {[92, 78, 85, 60, 70].map((w, i) => (
          <span key={i} className="block h-1.5 rounded-full bg-inv-paper/20" style={{ width: `${w}%` }} />
        ))}
      </div>
      <p className="mt-5 text-xs text-inv-paper/50">Ficha impressa, arquivada e difícil de encontrar.</p>
    </div>
    <div className="rounded-2xl border border-inv-leaf-soft/40 bg-inv-leaf-soft/10 p-5">
      <ScanLine className="h-5 w-5 text-inv-leaf-soft" strokeWidth={1.6} />
      <p className="mt-4 text-sm font-medium text-inv-paper">Depois</p>
      <div className="mt-4 space-y-2">
        {[92, 78, 85, 60, 70].map((w, i) => (
          <span key={i} className="block h-1.5 rounded-full bg-inv-leaf-soft/70 transition-all"
            style={{ width: `${w}%`, animation: `inv-rise .6s ease-out ${i * 90}ms both` }} />
        ))}
      </div>
      <p className="mt-5 text-xs text-inv-paper/70">Registro digital, assinado, versionado e pesquisável.</p>
    </div>
  </div>
);

export default Institucional;
