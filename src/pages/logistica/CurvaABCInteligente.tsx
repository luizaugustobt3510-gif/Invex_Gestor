import { useState, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line, Area } from 'recharts';
import { Upload, Settings, BarChart3, TableIcon, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useInventoryData } from '@/hooks/useInventoryData';
import { writeExcelFromAoa } from '@/lib/excelUtils';

interface RawRow {
  data?: string;
  dataLancamento?: string;
  destino?: string;
  material: string;
  unidade?: string;
  quantidade: number;
  valorUnitario?: number;
  total: number;
}

interface ABCItem {
  material: string;
  consumoTotal: number;
  consumoMensal: number;
  valorTotal: number;
  percentual: number;
  percentualAcumulado: number;
  classe: 'A' | 'B' | 'C';
  estoqueAtual: number;
  estoqueIdeal: number;
  compraSugerida: number;
}

interface ABCConfig {
  limiteA: number;
  limiteB: number;
  leadTime: number;
  estoqueSeguranca: number;
  periodo: number;
}

const defaultConfig: ABCConfig = {
  limiteA: 80,
  limiteB: 95,
  leadTime: 15,
  estoqueSeguranca: 7,
  periodo: 12,
};

const classeColors: Record<string, string> = {
  A: 'hsl(0 72% 51%)',
  B: 'hsl(45 97% 54%)',
  C: 'hsl(142 76% 36%)',
};

const classeBadge = (classe: string) => {
  const map: Record<string, string> = {
    A: 'bg-red-100 text-red-800 border-red-300',
    B: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    C: 'bg-green-100 text-green-800 border-green-300',
  };
  return map[classe] || '';
};

function parseCSVRows(text: string): RawRow[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());

  const findCol = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));
  const iMaterial = findCol(['material', 'produto', 'item', 'descrição', 'descricao']);
  const iQte = findCol(['qte', 'quantidade', 'qtd', 'qtde']);
  const iTotal = findCol(['total', 'valor total']);
  const iUnidade = findCol(['unidade', 'un', 'und']);
  const iValorUnit = findCol(['valor unitário', 'valor unitario', 'preco', 'preço', 'unitário', 'unitario']);
  const iDestino = findCol(['destino', 'setor']);
  const iData = findCol(['data']);

  if (iMaterial === -1 || iQte === -1) {
    toast.error('Colunas obrigatórias não encontradas: Material e Quantidade');
    return [];
  }

  const rows: RawRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim());
    const material = cols[iMaterial]?.trim();
    const qteStr = cols[iQte]?.replace(/[^\d.,-]/g, '').replace(',', '.');
    const totalStr = iTotal >= 0 ? cols[iTotal]?.replace(/[^\d.,-]/g, '').replace(',', '.') : '0';

    const quantidade = parseFloat(qteStr || '0');
    const total = parseFloat(totalStr || '0');

    if (!material || isNaN(quantidade) || quantidade <= 0) continue;

    rows.push({
      material,
      quantidade,
      total: isNaN(total) ? 0 : total,
      unidade: iUnidade >= 0 ? cols[iUnidade] : undefined,
      destino: iDestino >= 0 ? cols[iDestino] : undefined,
      data: iData >= 0 ? cols[iData] : undefined,
      valorUnitario: iValorUnit >= 0 ? parseFloat(cols[iValorUnit]?.replace(/[^\d.,-]/g, '').replace(',', '.') || '0') : undefined,
    });
  }
  return rows;
}

const ABC_STORAGE_KEY = 'invex_curva_abc_data';
const ABC_CONFIG_KEY = 'invex_curva_abc_config';

export default function CurvaABCInteligente() {
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<RawRow[]>(() => {
    try {
      const saved = localStorage.getItem(ABC_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [config, setConfig] = useState<ABCConfig>(() => {
    try {
      const saved = localStorage.getItem(ABC_CONFIG_KEY);
      return saved ? JSON.parse(saved) : defaultConfig;
    } catch { return defaultConfig; }
  });
  const [activeTab, setActiveTab] = useState(parsedRows.length > 0 ? 'analise' : 'importar');
  const { data: inventoryData } = useInventoryData();

  const handleImport = useCallback(() => {
    const rows = parseCSVRows(rawText);
    if (rows.length === 0) {
      toast.error('Nenhum dado válido encontrado. Verifique o formato.');
      return;
    }
    setParsedRows(rows);
    localStorage.setItem(ABC_STORAGE_KEY, JSON.stringify(rows));
    toast.success(`${rows.length} registros importados com sucesso!`);
    setActiveTab('analise');
  }, [rawText]);

  const handleReset = useCallback(() => {
    setParsedRows([]);
    setRawText('');
    setConfig(defaultConfig);
    localStorage.removeItem(ABC_STORAGE_KEY);
    localStorage.removeItem(ABC_CONFIG_KEY);
    setActiveTab('importar');
    toast.success('Curva ABC resetada com sucesso!');
  }, []);

  const abcItems = useMemo<ABCItem[]>(() => {
    if (parsedRows.length === 0) return [];

    const grouped: Record<string, { consumo: number; valor: number }> = {};
    parsedRows.forEach(r => {
      const key = r.material.toUpperCase().trim();
      if (!grouped[key]) grouped[key] = { consumo: 0, valor: 0 };
      grouped[key].consumo += r.quantidade;
      grouped[key].valor += r.total;
    });

    const sorted = Object.entries(grouped)
      .map(([material, d]) => ({ material, ...d }))
      .sort((a, b) => b.consumo - a.consumo);

    const consumoGeral = sorted.reduce((s, i) => s + i.consumo, 0);
    let acumulado = 0;

    return sorted.map(item => {
      const percentual = consumoGeral > 0 ? (item.consumo / consumoGeral) * 100 : 0;
      acumulado += percentual;
      const classe = acumulado <= config.limiteA ? 'A' : acumulado <= config.limiteB ? 'B' : 'C';
      const consumoMensal = item.consumo / config.periodo;

      const inv = inventoryData.find(i => i.material.toUpperCase().trim() === item.material);
      const estoqueAtual = inv?.quantidade ?? 0;

      const segDias = classe === 'A' ? config.estoqueSeguranca * 1.5 : classe === 'B' ? config.estoqueSeguranca : config.estoqueSeguranca * 0.5;
      const estoqueIdeal = consumoMensal * (config.leadTime + segDias) / 30;
      const compraSugerida = Math.max(0, Math.ceil(estoqueIdeal - estoqueAtual));

      return {
        material: item.material,
        consumoTotal: item.consumo,
        consumoMensal: Math.round(consumoMensal * 100) / 100,
        valorTotal: Math.round(item.valor * 100) / 100,
        percentual: Math.round(percentual * 100) / 100,
        percentualAcumulado: Math.round(acumulado * 100) / 100,
        classe,
        estoqueAtual,
        estoqueIdeal: Math.round(estoqueIdeal * 100) / 100,
        compraSugerida,
      };
    });
  }, [parsedRows, config, inventoryData]);

  // Persist ABC results and config to localStorage
  useEffect(() => {
    if (abcItems.length > 0) {
      localStorage.setItem('invex_curva_abc_results', JSON.stringify(abcItems));
    }
  }, [abcItems]);

  useEffect(() => {
    localStorage.setItem(ABC_CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  const summary = useMemo(() => {
    const a = abcItems.filter(i => i.classe === 'A');
    const b = abcItems.filter(i => i.classe === 'B');
    const c = abcItems.filter(i => i.classe === 'C');
    return {
      totalItens: abcItems.length,
      qtdA: a.length, qtdB: b.length, qtdC: c.length,
      valorTotal: abcItems.reduce((s, i) => s + i.valorTotal, 0),
      top10: abcItems.slice(0, 10),
      pieData: [
        { name: 'Classe A', value: a.length, fill: classeColors.A },
        { name: 'Classe B', value: b.length, fill: classeColors.B },
        { name: 'Classe C', value: c.length, fill: classeColors.C },
      ],
      paretoData: abcItems.slice(0, 30).map(i => ({
        name: i.material.length > 20 ? i.material.substring(0, 20) + '…' : i.material,
        consumo: i.consumoTotal,
        acumulado: i.percentualAcumulado,
      })),
    };
  }, [abcItems]);

  const handleExport = useCallback(async () => {
    if (abcItems.length === 0) return;
    const header = ['Material', 'Classe', 'Consumo Total', 'Consumo Mensal', 'Valor Total', '% Individual', '% Acumulado', 'Estoque Atual', 'Estoque Ideal', 'Compra Sugerida'];
    const rows = abcItems.map(i => [i.material, i.classe, i.consumoTotal, i.consumoMensal, i.valorTotal, i.percentual, i.percentualAcumulado, i.estoqueAtual, i.estoqueIdeal, i.compraSugerida]);
    await writeExcelFromAoa('curva_abc_inteligente.xlsx', 'Curva ABC', [header, ...rows]);
    toast.success('Relatório exportado!');
  }, [abcItems]);

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">Curva ABC Inteligente</h1>
          {abcItems.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> Exportar</Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="importar"><Upload className="w-4 h-4 mr-1 hidden sm:inline" /> Importar</TabsTrigger>
            <TabsTrigger value="analise"><TableIcon className="w-4 h-4 mr-1 hidden sm:inline" /> Análise</TabsTrigger>
            <TabsTrigger value="dashboard"><BarChart3 className="w-4 h-4 mr-1 hidden sm:inline" /> Dashboard</TabsTrigger>
            <TabsTrigger value="config"><Settings className="w-4 h-4 mr-1 hidden sm:inline" /> Config</TabsTrigger>
          </TabsList>

          {/* ─── IMPORTAR ─── */}
          <TabsContent value="importar">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Importar Relatório de Saída</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Cole abaixo o relatório de saída de estoque. O sistema aceita dados separados por tabulação, ponto-e-vírgula ou vírgula.
                  Colunas esperadas: <strong>Data, Destino, Material, Unidade, Quantidade, Valor Unitário, Total</strong>.
                </p>
                <Textarea
                  className="min-h-[250px] font-mono text-xs"
                  placeholder={"Data\tDestino\tMaterial\tUnidade\tQte\tValor Unitário\tTotal\n01/01/2025\tSetor A\tProduto X\tUN\t50\t10.00\t500.00"}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleImport} disabled={!rawText.trim()}><Upload className="w-4 h-4 mr-2" /> Processar Dados</Button>
                  <Button variant="outline" onClick={() => { setRawText(''); setParsedRows([]); }}>Limpar</Button>
                </div>
                {parsedRows.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-md p-3 border border-green-200">
                    <CheckCircle2 className="w-4 h-4" /> {parsedRows.length} registros importados — {abcItems.length} materiais agrupados
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── ANÁLISE ─── */}
          <TabsContent value="analise">
            {abcItems.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Importe dados para visualizar a análise.</CardContent></Card>
            ) : (
              <Card>
                <CardHeader><CardTitle>Ranking de Materiais — Curva ABC</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[65vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Material</TableHead>
                          <TableHead>Classe</TableHead>
                          <TableHead className="text-right">Consumo Total</TableHead>
                          <TableHead className="text-right">Consumo/Mês</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                          <TableHead className="text-right">%</TableHead>
                          <TableHead className="text-right">% Acum.</TableHead>
                          <TableHead className="text-right">Est. Atual</TableHead>
                          <TableHead className="text-right">Est. Ideal</TableHead>
                          <TableHead className="text-right">Compra Sugerida</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {abcItems.map((item, idx) => (
                          <TableRow key={item.material}>
                            <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                            <TableCell className="font-medium max-w-[200px] truncate" title={item.material}>{item.material}</TableCell>
                            <TableCell><Badge className={classeBadge(item.classe)}>{item.classe}</Badge></TableCell>
                            <TableCell className="text-right">{item.consumoTotal.toLocaleString('pt-BR')}</TableCell>
                            <TableCell className="text-right">{item.consumoMensal.toLocaleString('pt-BR')}</TableCell>
                            <TableCell className="text-right">R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">{item.percentual}%</TableCell>
                            <TableCell className="text-right">{item.percentualAcumulado}%</TableCell>
                            <TableCell className="text-right">{item.estoqueAtual.toLocaleString('pt-BR')}</TableCell>
                            <TableCell className="text-right">{item.estoqueIdeal.toLocaleString('pt-BR')}</TableCell>
                            <TableCell className="text-right">
                              {item.compraSugerida > 0 ? (
                                <span className="font-semibold text-red-600">{item.compraSugerida.toLocaleString('pt-BR')}</span>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ─── DASHBOARD ─── */}
          <TabsContent value="dashboard">
            {abcItems.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Importe dados para visualizar o dashboard.</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Total Itens</p><p className="text-2xl font-bold text-foreground">{summary.totalItens}</p></CardContent></Card>
                  <Card className="border-red-200"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Classe A</p><p className="text-2xl font-bold text-red-600">{summary.qtdA}</p></CardContent></Card>
                  <Card className="border-yellow-200"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Classe B</p><p className="text-2xl font-bold text-yellow-600">{summary.qtdB}</p></CardContent></Card>
                  <Card className="border-green-200"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Classe C</p><p className="text-2xl font-bold text-green-600">{summary.qtdC}</p></CardContent></Card>
                  <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Valor Total</p><p className="text-lg font-bold text-foreground">R$ {summary.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></CardContent></Card>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Pie */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">Distribuição por Classe</CardTitle></CardHeader>
                    <CardContent>
                      <ChartContainer config={{ value: { label: 'Itens' } }} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Pie data={summary.pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                              {summary.pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Pareto */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">Curva de Pareto</CardTitle></CardHeader>
                    <CardContent>
                      <ChartContainer config={{ consumo: { label: 'Consumo' }, acumulado: { label: '% Acumulado' } }} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={summary.paretoData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar yAxisId="left" dataKey="consumo" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke="hsl(0 72% 51%)" strokeWidth={2} dot={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Top 10 */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Top 10 Materiais Mais Consumidos</CardTitle></CardHeader>
                  <CardContent>
                    <ChartContainer config={{ consumo: { label: 'Consumo Total' } }} className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summary.top10.map(i => ({ name: i.material.length > 18 ? i.material.substring(0, 18) + '…' : i.material, consumo: i.consumoTotal, fill: classeColors[i.classe] }))} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="consumo" radius={[0, 4, 4, 0]}>
                            {summary.top10.map((e, i) => <Cell key={i} fill={classeColors[e.classe]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Itens com alerta de compra */}
                {abcItems.filter(i => i.compraSugerida > 0).length > 0 && (
                  <Card className="border-orange-200">
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /> Itens com Necessidade de Compra</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {abcItems.filter(i => i.compraSugerida > 0).slice(0, 12).map(i => (
                          <div key={i.material} className="flex justify-between items-center p-2 rounded-md bg-muted/50 border text-sm">
                            <div className="truncate flex-1 mr-2">
                              <Badge className={`${classeBadge(i.classe)} mr-1 text-[10px] px-1`}>{i.classe}</Badge>
                              <span className="truncate">{i.material}</span>
                            </div>
                            <span className="font-semibold text-red-600 whitespace-nowrap">+{i.compraSugerida}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ─── CONFIG ─── */}
          <TabsContent value="config">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Configurações da Curva ABC</CardTitle></CardHeader>
              <CardContent className="space-y-6 max-w-lg">
                <div className="space-y-2">
                  <Label>Limite Classe A: {config.limiteA}%</Label>
                  <Slider min={50} max={90} step={1} value={[config.limiteA]} onValueChange={([v]) => setConfig(c => ({ ...c, limiteA: v }))} />
                </div>
                <div className="space-y-2">
                  <Label>Limite Classe B: {config.limiteB}%</Label>
                  <Slider min={config.limiteA + 1} max={99} step={1} value={[config.limiteB]} onValueChange={([v]) => setConfig(c => ({ ...c, limiteB: v }))} />
                </div>
                <div className="space-y-2">
                  <Label>Lead Time (dias de reposição)</Label>
                  <Input type="number" min={1} max={180} value={config.leadTime} onChange={e => setConfig(c => ({ ...c, leadTime: Math.max(1, Number(e.target.value) || 1) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Estoque de Segurança (dias base)</Label>
                  <Input type="number" min={0} max={90} value={config.estoqueSeguranca} onChange={e => setConfig(c => ({ ...c, estoqueSeguranca: Math.max(0, Number(e.target.value) || 0) }))} />
                  <p className="text-xs text-muted-foreground">Classe A recebe 1.5x, Classe B 1x, Classe C 0.5x deste valor.</p>
                </div>
                <div className="space-y-2">
                  <Label>Período de Análise (meses)</Label>
                  <Input type="number" min={1} max={24} value={config.periodo} onChange={e => setConfig(c => ({ ...c, periodo: Math.max(1, Number(e.target.value) || 1) }))} />
                </div>
                <Button variant="outline" onClick={() => setConfig(defaultConfig)}>Restaurar Padrão</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
