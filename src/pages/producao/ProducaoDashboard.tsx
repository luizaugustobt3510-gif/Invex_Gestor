import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Factory, PackagePlus, PackageSearch, ClipboardList, Gauge, TrendingDown, DollarSign, Boxes, AlertTriangle, Layers, ShoppingCart } from 'lucide-react';
import { useProducaoData, brl } from './useProducaoData';
import { rendimento, desvioFicha, stockStatus, custoUnitario } from './producaoCalc';
import { getValidadeInfo } from '@/lib/validade';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))', 'hsl(var(--accent-foreground))'];
const PERIODOS = [7, 30, 90] as const;
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
  <Card><CardContent className="p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
    </div>
    <p className="text-xl md:text-2xl font-bold text-foreground">{value}</p>
    {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
  </CardContent></Card>
);
}

export default function ProducaoDashboard() {
  const navigate = useNavigate();
  const { mats, entries, orders, recipes, matById, entryById, loading } = useProducaoData();
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);

  const desde = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - (dias - 1)); d.setHours(0, 0, 0, 0); return d; }, [dias]);
  const ordersP = useMemo(() => orders.filter((o) => new Date(o.created_at) >= desde), [orders, desde]);
  const entriesP = useMemo(() => entries.filter((e) => new Date(e.created_at) >= desde), [entries, desde]);

  const kpi = useMemo(() => {
    const cons = ordersP.reduce((s, o) => s + o.quantidade_consumida, 0);
    const prod = ordersP.reduce((s, o) => s + o.quantidade_produzida, 0);
    const custo = ordersP.reduce((s, o) => s + o.custo_materia_prima, 0);
    const r = rendimento(cons, prod);
    const abertos = entries.filter((e) => e.quantidade_restante > 0);
    const valorSaldo = abertos.reduce((s, e) => s + (e.quantidade > 0 ? (e.custo_total / e.quantidade) * e.quantidade_restante : 0), 0);
    return {
      producoes: ordersP.length, cons, prod, custo, rend: r.rendimento, perda: r.perda,
      custoUn: custoUnitario(custo, prod), lotesAbertos: abertos.length, valorSaldo,
      entradas: entriesP.length, gastoMP: entriesP.reduce((s, e) => s + e.custo_total, 0),
    };
  }, [ordersP, entriesP, entries]);

  const porDia = useMemo(() => {
    const map = new Map<string, { dia: string; produzido: number; consumido: number }>();
    for (let i = 0; i < dias; i++) {
      const d = new Date(desde); d.setDate(d.getDate() + i); d.setHours(12, 0, 0, 0);
      map.set(dayKey(d), { dia: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }), produzido: 0, consumido: 0 });
    }
    ordersP.forEach((o) => {
      const row = map.get(dayKey(new Date(o.created_at)));
      if (row) { row.produzido += o.quantidade_produzida; row.consumido += o.quantidade_consumida; }
    });
    return [...map.values()];
  }, [ordersP, dias, desde]);

  const porProduto = useMemo(() => {
    const map = new Map<string, { produto: string; produzido: number; consumido: number }>();
    ordersP.forEach((o) => {
      const nome = matById[o.produto_material_id]?.material ?? '—';
      const row = map.get(nome) ?? { produto: nome, produzido: 0, consumido: 0 };
      row.produzido += o.quantidade_produzida; row.consumido += o.quantidade_consumida; map.set(nome, row);
    });
    return [...map.values()].map((r) => ({ ...r, rendimento: Math.round(rendimento(r.consumido, r.produzido).rendimento * 10) / 10 }))
      .sort((a, b) => b.produzido - a.produzido).slice(0, 8);
  }, [ordersP, matById]);

  const porMP = useMemo(() => {
    const map = new Map<string, number>();
    ordersP.forEach((o) => {
      const e = entryById[o.entry_id];
      const nome = e ? matById[e.material_id]?.material ?? '—' : '—';
      map.set(nome, (map.get(nome) ?? 0) + o.quantidade_consumida);
    });
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [ordersP, entryById, matById]);

  const estoquePF = useMemo(() => mats.filter((m) => m.tipo === 'produto_final')
    .map((m) => ({ produto: m.material, quantidade: m.quantidade })).sort((a, b) => b.quantidade - a.quantidade).slice(0, 8), [mats]);

  const alertas = useMemo(() => {
    const list: { nivel: 'critico' | 'alerta'; texto: string; acao?: () => void }[] = [];
    mats.filter((m) => m.tipo !== 'comum').forEach((m) => {
      const st = stockStatus(m.quantidade, m.minimo);
      const tipo = m.tipo === 'materia_prima' ? 'Matéria-prima' : 'Produto final';
      if (st === 'Zerado') list.push({ nivel: 'critico', texto: `${tipo} ${m.material} zerada no estoque`, acao: () => navigate(m.tipo === 'materia_prima' ? `/logistica/entrada-materia-prima?material=${m.id}` : `/producao/processar`) });
      else if (st === 'Abaixo do Mínimo') list.push({ nivel: 'alerta', texto: `${tipo} ${m.material} abaixo do mínimo (${m.quantidade} de ${m.minimo})` });
    });
    entries.filter((e) => e.quantidade_restante > 0).forEach((e) => {
      const st = getValidadeInfo(e.validade ?? '').status;
      if (st === 'vencido') list.push({ nivel: 'critico', texto: `Lote ${e.numero_controle} (${matById[e.material_id]?.material}) vencido com saldo ${e.quantidade_restante}`, acao: () => navigate('/producao/lotes') });
      else if (st === 'critico') list.push({ nivel: 'alerta', texto: `Lote ${e.numero_controle} vence em até 30 dias — saldo ${e.quantidade_restante}`, acao: () => navigate(`/producao/processar?entry=${e.id}`) });
    });
    ordersP.forEach((o) => {
      const e = entryById[o.entry_id];
      const f = recipes.find((r) => r.produto_material_id === o.produto_material_id && r.materia_prima_id === e?.material_id);
      if (!f) return;
      const d = desvioFicha(rendimento(o.quantidade_consumida, o.quantidade_produzida).rendimento, f.rendimento_esperado);
      if (d <= -5) list.push({ nivel: 'alerta', texto: `Produção ${o.lote_produto} rendeu ${Math.abs(d)} pontos abaixo da ficha`, acao: () => navigate('/producao/fichas') });
    });
    return list.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'critico' ? -1 : 1)).slice(0, 10);
  }, [mats, entries, ordersP, recipes, entryById, matById, navigate]);


  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Factory className="w-6 h-6 text-primary" /> Produção — visão geral</h1>
            <p className="text-muted-foreground text-sm">Entrada de matéria-prima → processamento → produto final no estoque → venda.</p>
          </div>
          <div className="flex gap-1">
            {PERIODOS.map((p) => <Button key={p} size="sm" variant={dias === p ? 'default' : 'outline'} onClick={() => setDias(p)}>{p} dias</Button>)}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button variant="outline" className="justify-start" onClick={() => navigate('/logistica/entrada-materia-prima')}><PackagePlus className="w-4 h-4 mr-2" /> Entrada de matéria-prima</Button>
          <Button variant="outline" className="justify-start" onClick={() => navigate('/producao/processar')}><Factory className="w-4 h-4 mr-2" /> Processar</Button>
          <Button variant="outline" className="justify-start" onClick={() => navigate('/producao/lotes')}><PackageSearch className="w-4 h-4 mr-2" /> Lotes e rastreio</Button>
          <Button variant="outline" className="justify-start" onClick={() => navigate('/vendas/pdv')}><ShoppingCart className="w-4 h-4 mr-2" /> Vender no PDV</Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi icon={<Factory className="w-4 h-4" />} label="Produções" value={String(kpi.producoes)} hint={`${fmtNum(kpi.prod)} produzidos`} />
              <Kpi icon={<Gauge className="w-4 h-4" />} label="Rendimento médio" value={`${kpi.rend.toFixed(1)}%`} hint={`${fmtNum(kpi.cons)} consumidos`} />
              <Kpi icon={<TrendingDown className="w-4 h-4" />} label="Perda total" value={fmtNum(kpi.perda)} hint={kpi.cons > 0 ? `${(100 - kpi.rend).toFixed(1)}% do consumido` : undefined} />
              <Kpi icon={<DollarSign className="w-4 h-4" />} label="Custo por unidade" value={brl(kpi.custoUn)} hint={`${brl(kpi.custo)} de matéria-prima usada`} />
              <Kpi icon={<PackagePlus className="w-4 h-4" />} label="Entradas de MP" value={String(kpi.entradas)} hint={`${brl(kpi.gastoMP)} em compras`} />
              <Kpi icon={<Layers className="w-4 h-4" />} label="Lotes com saldo" value={String(kpi.lotesAbertos)} hint={`${brl(kpi.valorSaldo)} parados em matéria-prima`} />
              <Kpi icon={<Boxes className="w-4 h-4" />} label="Matérias-primas" value={String(mats.filter((m) => m.tipo === 'materia_prima').length)} />
              <Kpi icon={<ClipboardList className="w-4 h-4" />} label="Fichas técnicas" value={String(recipes.length)} hint={`${mats.filter((m) => m.tipo === 'produto_final').length} produtos finais`} />
            </div>

            {alertas.length > 0 && (
              <Card className="border-warning/40">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /> Atenção</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {alertas.map((a, i) => (
                    <button key={i} type="button" onClick={a.acao} className="w-full flex items-center gap-2 text-left text-sm rounded-md border p-2 hover:bg-accent">
                      <Badge variant={a.nivel === 'critico' ? 'destructive' : 'outline'}>{a.nivel === 'critico' ? 'Crítico' : 'Alerta'}</Badge>
                      <span>{a.texto}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Produção por dia</CardTitle></CardHeader>
                <CardContent>
                  {ordersP.length ? (
                    <ChartContainer config={{ produzido: { label: 'Produzido', color: 'hsl(var(--primary))' }, consumido: { label: 'Consumido', color: 'hsl(var(--muted-foreground))' } }} className="h-[250px] w-full">
                      <BarChart data={porDia}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="dia" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 11 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="consumido" fill="var(--color-consumido)" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="produzido" fill="var(--color-produzido)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : <p className="text-center text-muted-foreground py-8">Sem produções no período</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Rendimento por produto (%)</CardTitle></CardHeader>
                <CardContent>
                  {porProduto.length ? (
                    <ChartContainer config={{ rendimento: { label: 'Rendimento %', color: 'hsl(var(--primary))' } }} className="h-[250px] w-full">
                      <BarChart data={porProduto} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="produto" width={110} tick={{ fontSize: 11 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="rendimento" fill="var(--color-rendimento)" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : <p className="text-center text-muted-foreground py-8">Sem produções no período</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Consumo por matéria-prima</CardTitle></CardHeader>
                <CardContent>
                  {porMP.length ? (
                    <ChartContainer config={{ value: { label: 'Consumido' } }} className="h-[250px] w-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <Pie data={porMP} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                          {porMP.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ChartContainer>
                  ) : <p className="text-center text-muted-foreground py-8">Sem consumo no período</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Estoque de produtos finais</CardTitle></CardHeader>
                <CardContent>
                  {estoquePF.length ? (
                    <ChartContainer config={{ quantidade: { label: 'Em estoque', color: 'hsl(var(--primary))' } }} className="h-[250px] w-full">
                      <BarChart data={estoquePF}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="produto" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="quantidade" radius={[3, 3, 0, 0]}>
                          {estoquePF.map((p, i) => <Cell key={i} fill={p.quantidade > 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'} />)}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  ) : <p className="text-center text-muted-foreground py-8">Nenhum produto final ainda</p>}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
