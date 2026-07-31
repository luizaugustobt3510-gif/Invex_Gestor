import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { financeiroService } from '@/services/financeiroService';
import {
  format, parseISO, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, Line, ComposedChart } from 'recharts';
import { ChevronDown, ChevronRight, FileDown, Filter, TrendingUp, TrendingDown, Wallet, Percent } from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';
import { printHtmlDocument } from '@/lib/pdfDownload';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface Entry {
  id: string;
  tipo: string;
  status: string;
  valor: number;
  data: string;
  descricao: string;
  categoria_id: string | null;
}

interface Category { id: string; nome: string; tipo: string }

interface DreLine {
  key: string;
  nome: string;
  total: number;
  entries: Entry[];
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

const escapeHtml = (s: string) =>
  (s || '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));

const DRE = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [company, setCompany] = useState<{ name: string; cnpj: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [appliedFrom, setAppliedFrom] = useState(dateFrom);
  const [appliedTo, setAppliedTo] = useState(dateTo);

  const [openGroups, setOpenGroups] = useState({ receitas: true, despesas: true });
  const [detail, setDetail] = useState<DreLine | null>(null);

  useEffect(() => {
    if (!user?.companyId) return;
    const load = async () => {
      setLoading(true);
      const [entRes, catRes, compRes] = await Promise.all([
        supabase
          .from('financial_entries')
          .select('id, tipo, status, valor, data, descricao, categoria_id')
          .eq('company_id', user.companyId)
          .order('data'),
        financeiroService.getCategories(user.companyId),
        supabase.from('companies').select('name, cnpj').eq('id', user.companyId).maybeSingle(),
      ]);
      setEntries((entRes.data as Entry[]) || []);
      setCategories((catRes.data as Category[]) || []);
      setCompany(compRes.data || null);
      setLoading(false);
    };
    load();
  }, [user?.companyId]);

  const applyPreset = (preset: 'mes' | 'mes_anterior' | 'trimestre' | 'ano') => {
    const now = new Date();
    let from: Date, to: Date;
    if (preset === 'mes') { from = startOfMonth(now); to = endOfMonth(now); }
    else if (preset === 'mes_anterior') { const p = subMonths(now, 1); from = startOfMonth(p); to = endOfMonth(p); }
    else if (preset === 'trimestre') { from = startOfQuarter(now); to = endOfQuarter(now); }
    else { from = startOfYear(now); to = endOfYear(now); }
    const f = format(from, 'yyyy-MM-dd');
    const t = format(to, 'yyyy-MM-dd');
    setDateFrom(f); setDateTo(t); setAppliedFrom(f); setAppliedTo(t);
  };

  // Somente lançamentos efetivamente pagos/recebidos = DRE realizada
  const realizados = useMemo(
    () => entries.filter(e => e.data >= appliedFrom && e.data <= appliedTo && e.status === 'pago'),
    [entries, appliedFrom, appliedTo],
  );

  const buildLines = (tipo: 'receita' | 'despesa'): DreLine[] => {
    const cats = categories.filter(c => c.tipo === tipo);
    const rows: DreLine[] = cats.map(c => {
      const es = realizados.filter(e => e.tipo === tipo && e.categoria_id === c.id);
      return { key: c.id, nome: c.nome, total: es.reduce((s, e) => s + Number(e.valor), 0), entries: es };
    });
    const semCat = realizados.filter(e => e.tipo === tipo && !cats.some(c => c.id === e.categoria_id));
    if (semCat.length > 0) {
      rows.push({
        key: `sem-cat-${tipo}`,
        nome: tipo === 'receita' ? 'Outras receitas' : 'Outras despesas',
        total: semCat.reduce((s, e) => s + Number(e.valor), 0),
        entries: semCat,
      });
    }
    return rows.sort((a, b) => b.total - a.total);
  };

  const receitaLines = useMemo(() => buildLines('receita'), [realizados, categories]);
  const despesaLines = useMemo(() => buildLines('despesa'), [realizados, categories]);

  const totalReceitas = receitaLines.reduce((s, l) => s + l.total, 0);
  const totalDespesas = despesaLines.reduce((s, l) => s + l.total, 0);
  const resultado = totalReceitas - totalDespesas;
  const margem = totalReceitas > 0 ? (resultado / totalReceitas) * 100 : 0;

  const pct = (v: number) => (totalReceitas > 0 ? `${((v / totalReceitas) * 100).toFixed(1)}%` : '—');

  const byMonth = useMemo(() => {
    const map: Record<string, { receita: number; despesa: number }> = {};
    realizados.forEach(e => {
      const key = format(parseISO(e.data), 'MM/yy');
      if (!map[key]) map[key] = { receita: 0, despesa: 0 };
      if (e.tipo === 'receita') map[key].receita += Number(e.valor);
      else map[key].despesa += Number(e.valor);
    });
    return Object.entries(map).map(([mes, v]) => ({
      mes, receita: v.receita, despesa: v.despesa, resultado: v.receita - v.despesa,
    }));
  }, [realizados]);

  const periodoLabel = `${format(parseISO(appliedFrom), "dd/MM/yyyy", { locale: ptBR })} a ${format(parseISO(appliedTo), 'dd/MM/yyyy', { locale: ptBR })}`;

  const exportPdf = () => {
    const rowsHtml = (lines: DreLine[]) => lines.map(l => `
      <tr><td class="ind">${escapeHtml(l.nome)}</td><td class="num">${fmt(l.total)}</td><td class="num pct">${pct(l.total)}</td></tr>
    `).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
      <title>DRE - ${escapeHtml(company?.name || 'Empresa')}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px;font-size:12px}
        h1{font-size:18px;margin:0 0 4px}
        .meta{color:#555;font-size:11px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse}
        td,th{padding:6px 8px;border-bottom:1px solid #e5e5e5}
        .num{text-align:right;white-space:nowrap}
        .pct{width:70px;color:#666}
        .grp{background:#f3f4f6;font-weight:bold;text-transform:uppercase;font-size:11px}
        .ind{padding-left:24px}
        .tot{font-weight:bold;background:#fafafa}
        .res{font-weight:bold;background:#eef6f0;font-size:13px}
      </style></head><body>
      <h1>Demonstração do Resultado do Exercício (DRE)</h1>
      <div class="meta">
        <div><strong>${escapeHtml(company?.name || '-')}</strong></div>
        <div>CNPJ: ${escapeHtml(company?.cnpj || '-')}</div>
        <div>Período analisado: ${periodoLabel}</div>
        <div>Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
      </div>
      <table>
        <tr class="grp"><td>Receitas</td><td class="num">Valor</td><td class="num">% </td></tr>
        ${rowsHtml(receitaLines) || '<tr><td class="ind">Sem lançamentos</td><td class="num">R$ 0,00</td><td></td></tr>'}
        <tr class="tot"><td>Total de receitas</td><td class="num">${fmt(totalReceitas)}</td><td class="num">100%</td></tr>
        <tr class="grp"><td>(-) Despesas</td><td class="num">Valor</td><td class="num">%</td></tr>
        ${rowsHtml(despesaLines) || '<tr><td class="ind">Sem lançamentos</td><td class="num">R$ 0,00</td><td></td></tr>'}
        <tr class="tot"><td>Total de despesas</td><td class="num">${fmt(totalDespesas)}</td><td class="num">${pct(totalDespesas)}</td></tr>
        <tr class="res"><td>Resultado operacional</td><td class="num">${fmt(resultado)}</td><td class="num">${margem.toFixed(1)}%</td></tr>
        <tr class="res"><td>Margem operacional</td><td class="num">${margem.toFixed(1)}%</td><td></td></tr>
      </table>
      </body></html>`;

    printHtmlDocument(html, 'DRE');
    toast({ title: 'DRE gerada', description: 'Use a opção "Salvar como PDF" na janela de impressão.' });
  };

  const GroupRows = ({
    title, lines, total, openKey, negative,
  }: { title: string; lines: DreLine[]; total: number; openKey: 'receitas' | 'despesas'; negative?: boolean }) => {
    const open = openGroups[openKey];
    return (
      <>
        <tr
          className="bg-muted/60 cursor-pointer select-none"
          onClick={() => setOpenGroups(p => ({ ...p, [openKey]: !p[openKey] }))}
        >
          <td className="px-3 py-2 font-semibold text-xs uppercase tracking-wide">
            <span className="inline-flex items-center gap-1">
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {title}
            </span>
          </td>
          <td className="px-3 py-2 text-right font-semibold">{fmt(total)}</td>
          <td className="px-3 py-2 text-right text-muted-foreground hidden sm:table-cell">{negative ? pct(total) : '100%'}</td>
        </tr>
        {open && lines.length === 0 && (
          <tr><td colSpan={3} className="px-3 py-3 pl-9 text-muted-foreground text-sm">Sem lançamentos no período — {fmt(0)}</td></tr>
        )}
        {open && lines.map(l => (
          <tr
            key={l.key}
            className="border-b border-border/50 hover:bg-accent/40 cursor-pointer"
            onClick={() => setDetail(l)}
          >
            <td className="px-3 py-2 pl-9 text-sm">{l.nome}</td>
            <td className={`px-3 py-2 text-right text-sm tabular-nums ${negative ? 'text-danger' : 'text-success'}`}>
              {negative ? '- ' : ''}{fmt(l.total)}
            </td>
            <td className="px-3 py-2 text-right text-xs text-muted-foreground hidden sm:table-cell">{pct(l.total)}</td>
          </tr>
        ))}
        <tr className="border-b-2 border-border">
          <td className="px-3 py-2 font-semibold text-sm">{negative ? 'Total de despesas' : 'Total de receitas'}</td>
          <td className="px-3 py-2 text-right font-bold tabular-nums">{fmt(total)}</td>
          <td className="px-3 py-2 text-right text-xs text-muted-foreground hidden sm:table-cell">{negative ? pct(total) : '100%'}</td>
        </tr>
      </>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">DRE</h1>
            <p className="text-sm text-muted-foreground">
              Demonstração do Resultado do Exercício — realizada (lançamentos pagos/recebidos)
            </p>
          </div>
          <Button onClick={exportPdf} className="gap-2">
            <FileDown className="w-4 h-4" /> Exportar DRE
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4 flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <Label className="text-xs">Período inicial</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
              </div>
              <div>
                <Label className="text-xs">Período final</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
              </div>
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => { setAppliedFrom(dateFrom); setAppliedTo(dateTo); }}
              >
                <Filter className="w-4 h-4" /> Filtrar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 lg:ml-auto">
              <Button size="sm" variant="outline" onClick={() => applyPreset('mes')}>Este mês</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset('mes_anterior')}>Mês anterior</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset('trimestre')}>Este trimestre</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset('ano')}>Este ano</Button>
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Receita Bruta" value={fmt(totalReceitas)} icon={TrendingUp} variant="success" />
          <StatsCard title="Despesas" value={fmt(totalDespesas)} icon={TrendingDown} variant="danger" />
          <StatsCard title="Resultado Operacional" value={fmt(resultado)} icon={Wallet} variant={resultado >= 0 ? 'success' : 'danger'} />
          <StatsCard title="Margem" value={`${margem.toFixed(1)}%`} icon={Percent} variant={margem >= 0 ? 'default' : 'danger'} />
        </div>

        {/* Estrutura da DRE */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Estrutura da DRE
              <Badge variant="outline" className="font-normal">{periodoLabel}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-2">
            {loading ? (
              <p className="p-6 text-center text-muted-foreground">Carregando...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px]">
                  <tbody>
                    <GroupRows title="Receitas" lines={receitaLines} total={totalReceitas} openKey="receitas" />
                    <GroupRows title="(-) Despesas" lines={despesaLines} total={totalDespesas} openKey="despesas" negative />
                    <tr className="bg-primary/5">
                      <td className="px-3 py-3 font-bold">Resultado Operacional</td>
                      <td className={`px-3 py-3 text-right font-bold tabular-nums ${resultado >= 0 ? 'text-success' : 'text-danger'}`}>{fmt(resultado)}</td>
                      <td className="px-3 py-3 text-right text-xs text-muted-foreground hidden sm:table-cell">{margem.toFixed(1)}%</td>
                    </tr>
                    <tr className="bg-primary/5 border-t border-border">
                      <td className="px-3 py-3 font-bold">Margem Operacional</td>
                      <td className={`px-3 py-3 text-right font-bold ${margem >= 0 ? 'text-success' : 'text-danger'}`}>{margem.toFixed(1)}%</td>
                      <td className="hidden sm:table-cell" />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <p className="px-3 py-3 text-xs text-muted-foreground">
              Clique em uma categoria para ver os lançamentos que compõem o valor.
            </p>
          </CardContent>
        </Card>

        {/* Gráfico */}
        <Card>
          <CardHeader><CardTitle className="text-base">Evolução mensal do resultado</CardTitle></CardHeader>
          <CardContent>
            {byMonth.length > 0 ? (
              <ChartContainer
                config={{
                  receita: { label: 'Receitas', color: 'hsl(142 76% 36%)' },
                  despesa: { label: 'Despesas', color: 'hsl(0 72% 51%)' },
                  resultado: { label: 'Resultado', color: 'hsl(221 83% 53%)' },
                }}
                className="h-[300px] w-full"
              >
                <ResponsiveContainer>
                  <ComposedChart data={byMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => fmt(Number(v))} />
                    <Legend />
                    <Bar dataKey="receita" name="Receitas" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesa" name="Despesas" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="resultado" name="Resultado" stroke="hsl(221 83% 53%)" strokeWidth={2} dot />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados no período</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.nome}</DialogTitle>
            <DialogDescription>
              Total: {fmt(detail?.total || 0)} — {periodoLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto divide-y divide-border">
            {detail?.entries.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">Sem lançamentos.</p>
            )}
            {detail?.entries.map(e => (
              <button
                key={e.id}
                type="button"
                onClick={() => navigate('/financeiro/lancamentos')}
                className="w-full text-left py-2 flex items-center justify-between gap-3 hover:bg-accent/40 px-2 rounded"
              >
                <span className="min-w-0">
                  <span className="block text-sm truncate">{e.descricao}</span>
                  <span className="block text-xs text-muted-foreground">
                    {format(parseISO(e.data), 'dd/MM/yyyy')}
                  </span>
                </span>
                <span className="text-sm font-medium tabular-nums shrink-0">{fmt(Number(e.valor))}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default DRE;
