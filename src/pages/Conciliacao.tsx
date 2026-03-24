import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, AlertTriangle, XCircle, ClipboardCheck, Upload, Search, Trash2, Wrench, Package, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { readExcelFile } from '@/lib/excelUtils';

interface Material {
  id: string;
  codigo: string;
  material: string;
  quantidade: number;
  preco: number;
  unidade: string;
}

interface ReconciliationItem {
  material_id: string;
  codigo: string;
  material: string;
  unidade: string;
  preco: number;
  saldo_invex: number;
  saldo_sistema: number;
  divergencia: number;
  divergencia_valor: number;
  status: 'ok' | 'sobra' | 'falta' | 'sem_dado';
}

interface BatchItem {
  lote: string;
  count: number;
  tipo: string; // 'saida' | 'saldo_sistema'
}

const Conciliacao = () => {
  const [searchParams] = useSearchParams();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const filtro = searchParams.get('filtro');
    return filtro && ['ok', 'sobra', 'falta', 'sem_dado'].includes(filtro) ? filtro : 'todos';
  });

  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importMode, setImportMode] = useState<'saida' | 'saldo_sistema'>('saida');
  const [importData, setImportData] = useState<any[]>([]);
  const [importLote, setImportLote] = useState('');

  // Adjust state
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<ReconciliationItem | null>(null);
  const [adjustMotivo, setAdjustMotivo] = useState('');

  // Batches
  const [batches, setBatches] = useState<BatchItem[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .not('company_id', 'is', null)
        .limit(1)
        .single();

      if (!roleData?.company_id) return;
      setCompanyId(roleData.company_id);

      const [matRes, saldoRes, movRes] = await Promise.all([
        supabase.from('materials').select('*').eq('company_id', roleData.company_id).order('codigo'),
        supabase.from('saldo_sistema_importado').select('*').eq('company_id', roleData.company_id).order('data_importacao', { ascending: false }),
        supabase.from('movimentacoes_importadas').select('*').eq('company_id', roleData.company_id),
      ]);

      const mats = (matRes.data || []) as Material[];
      setMaterials(mats);

      const saldos = saldoRes.data || [];
      const movs = movRes.data || [];

      // Build reconciliation: saldo_invex (current qty) vs latest saldo_sistema
      const reconItems: ReconciliationItem[] = mats.map(m => {
        const saldoInvex = Number(m.quantidade);
        // Get most recent system balance for this material
        const lastSaldo = saldos.find((s: any) => s.material_id === m.id);
        const saldoSistema = lastSaldo ? Number((lastSaldo as any).saldo_sistema) : -1; // -1 means no import

        if (saldoSistema < 0) {
          return {
            material_id: m.id,
            codigo: m.codigo,
            material: m.material,
            unidade: m.unidade,
            preco: Number(m.preco),
            saldo_invex: saldoInvex,
            saldo_sistema: -1,
            divergencia: 0,
            divergencia_valor: 0,
            status: 'sem_dado' as const,
          };
        }

        const divergencia = saldoInvex - saldoSistema;
        let status: 'ok' | 'sobra' | 'falta' = 'ok';
        if (divergencia > 0) status = 'sobra';
        else if (divergencia < 0) status = 'falta';

        return {
          material_id: m.id,
          codigo: m.codigo,
          material: m.material,
          unidade: m.unidade,
          preco: Number(m.preco),
          saldo_invex: saldoInvex,
          saldo_sistema: saldoSistema,
          divergencia,
          divergencia_valor: divergencia * Number(m.preco),
          status,
        };
      });

      setReconciliation(reconItems);

      // Build batch list from both tables
      const batchList: BatchItem[] = [];
      const movBatchMap = new Map<string, number>();
      movs.forEach((mov: any) => {
        movBatchMap.set(mov.lote_importacao, (movBatchMap.get(mov.lote_importacao) || 0) + 1);
      });
      movBatchMap.forEach((count, lote) => batchList.push({ lote, count, tipo: 'saida' }));

      const saldoBatchMap = new Map<string, number>();
      saldos.forEach((s: any) => {
        saldoBatchMap.set(s.lote_importacao, (saldoBatchMap.get(s.lote_importacao) || 0) + 1);
      });
      saldoBatchMap.forEach((count, lote) => batchList.push({ lote, count, tipo: 'saldo_sistema' }));

      setBatches(batchList);
    } catch {
      toast.error('Erro ao carregar dados de conciliação');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    let items = [...reconciliation];
    if (searchQuery) {
      items = items.filter(i =>
        i.material.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.codigo.includes(searchQuery)
      );
    }
    if (statusFilter !== 'todos') {
      items = items.filter(i => i.status === statusFilter);
    }
    return items;
  }, [reconciliation, searchQuery, statusFilter]);

  // Dashboard metrics
  const itemsWithSaldo = reconciliation.filter(i => i.status !== 'sem_dado');
  const semDado = reconciliation.filter(i => i.status === 'sem_dado').length;
  const totalItems = itemsWithSaldo.length;
  const okItems = itemsWithSaldo.filter(i => i.status === 'ok').length;
  const sobras = itemsWithSaldo.filter(i => i.status === 'sobra').length;
  const faltas = itemsWithSaldo.filter(i => i.status === 'falta').length;
  const totalDivergenciaValor = itemsWithSaldo.reduce((s, i) => s + Math.abs(i.divergencia_valor), 0);
  const healthPct = totalItems > 0 ? Math.round((okItems / totalItems) * 100) : 100;

  const pieData = [
    { name: 'OK', value: okItems, color: 'hsl(142, 76%, 36%)' },
    { name: 'Sobra', value: sobras, color: 'hsl(38, 92%, 50%)' },
    { name: 'Falta', value: faltas, color: 'hsl(0, 72%, 51%)' },
  ].filter(d => d.value > 0);

  // Import file handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const json = await readExcelFile(buffer);
        setImportData(json);
        const now = new Date();
        setImportLote(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-semana-${Math.ceil(now.getDate() / 7)}`);
      } catch {
        toast.error('Erro ao ler arquivo');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleProcessImport = async () => {
    if (!companyId || importData.length === 0 || !importLote) return;

    try {
      if (importMode === 'saida') {
        // Import exits and apply to Invex stock
        const rows = importData.map((row: any) => {
          const codigo = String(row.codigo || row.Codigo || row.CODIGO || '').trim();
          const quantidade = Number(row.quantidade || row.Quantidade || row.QUANTIDADE || 0);
          const mat = materials.find(m => m.codigo === codigo);
          return { codigo, quantidade, material_id: mat?.id, currentQty: mat ? Number(mat.quantidade) : 0 };
        }).filter(r => r.material_id && r.quantidade > 0);

        if (rows.length === 0) { toast.error('Nenhum produto válido encontrado'); return; }

        // Insert into movimentacoes_importadas
        const inserts = rows.map(r => ({
          company_id: companyId,
          material_id: r.material_id!,
          tipo: 'saida' as const,
          quantidade: r.quantidade,
          lote_importacao: importLote,
          data: new Date().toISOString(),
        }));

        const { error: movError } = await supabase.from('movimentacoes_importadas').insert(inserts);
        if (movError) throw movError;

        // Apply exits: subtract from Invex stock
        for (const r of rows) {
          const newQty = Math.max(0, r.currentQty - r.quantidade);
          await supabase.from('materials').update({ quantidade: newQty }).eq('id', r.material_id!);
        }

        toast.success(`${rows.length} saídas importadas e aplicadas ao estoque!`);

      } else {
        // Import system balances
        const rows = importData.map((row: any) => {
          const codigo = String(row.codigo || row.Codigo || row.CODIGO || '').trim();
          const saldo = Number(row.saldo_sistema || row.saldo || row.Saldo || row.SALDO || 0);
          const mat = materials.find(m => m.codigo === codigo);
          return { codigo, saldo, material_id: mat?.id };
        }).filter(r => r.material_id != null);

        if (rows.length === 0) { toast.error('Nenhum produto cadastrado no Invex encontrado na planilha'); return; }

        const inserts = rows.map(r => ({
          company_id: companyId,
          material_id: r.material_id!,
          saldo_sistema: r.saldo,
          lote_importacao: importLote,
        }));

        const { error } = await supabase.from('saldo_sistema_importado').insert(inserts);
        if (error) throw error;

        toast.success(`${rows.length} saldos do sistema importados!`);
      }

      setImportDialogOpen(false);
      setImportData([]);
      loadData();
    } catch {
      toast.error('Erro ao processar importação');
    }
  };

  const handleDeleteBatch = async (lote: string, tipo: string) => {
    if (!companyId) return;
    try {
      if (tipo === 'saida') {
        // TODO: ideally reverse stock changes, but for simplicity just delete records
        const { error } = await supabase.from('movimentacoes_importadas').delete().eq('company_id', companyId).eq('lote_importacao', lote);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saldo_sistema_importado').delete().eq('company_id', companyId).eq('lote_importacao', lote);
        if (error) throw error;
      }
      toast.success('Lote removido!');
      loadData();
    } catch {
      toast.error('Erro ao remover lote');
    }
  };

  const handleAdjust = async () => {
    if (!adjustItem || !companyId || !adjustMotivo) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('materials').update({ quantidade: adjustItem.saldo_sistema }).eq('id', adjustItem.material_id);

      await supabase.from('conciliacao_log').insert({
        company_id: companyId,
        material_id: adjustItem.material_id,
        saldo_fisico: adjustItem.saldo_invex,
        saldo_teorico: adjustItem.saldo_sistema,
        divergencia: adjustItem.divergencia,
        tipo_ajuste: 'conciliacao',
        motivo: adjustMotivo,
        usuario_id: user.id,
      });

      toast.success('Ajuste realizado!');
      setAdjustDialogOpen(false);
      setAdjustMotivo('');
      loadData();
    } catch {
      toast.error('Erro ao realizar ajuste');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok': return <Badge className="bg-success text-success-foreground">OK</Badge>;
      case 'sobra': return <Badge className="bg-warning text-warning-foreground">Sobra</Badge>;
      case 'falta': return <Badge className="bg-danger text-danger-foreground">Falta</Badge>;
      case 'sem_dado': return <Badge variant="outline" className="text-muted-foreground">Sem dado</Badge>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Carregando conciliação...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <ClipboardCheck className="w-7 h-7 md:w-8 md:h-8 text-primary" />
          Conciliação de Estoque
        </h1>

        <Tabs defaultValue="dashboard" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="dashboard">Resumo</TabsTrigger>
            <TabsTrigger value="conciliacao">Conciliação</TabsTrigger>
            <TabsTrigger value="importar">Importar</TabsTrigger>
          </TabsList>

          {/* DASHBOARD TAB */}
          <TabsContent value="dashboard" className="space-y-4 md:space-y-6">
            {/* Health Indicator */}
            <Card className={`border-2 ${totalItems === 0 ? 'border-muted' : faltas === 0 && sobras === 0 ? 'border-success' : healthPct >= 80 ? 'border-warning' : 'border-danger'}`}>
              <CardContent className="p-4 md:p-6 flex items-center gap-4 md:gap-6">
                {totalItems === 0 ? (
                  <Package className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground" />
                ) : faltas === 0 && sobras === 0 ? (
                  <CheckCircle className="w-12 h-12 md:w-16 md:h-16 text-success" />
                ) : healthPct >= 80 ? (
                  <AlertTriangle className="w-12 h-12 md:w-16 md:h-16 text-warning" />
                ) : (
                  <XCircle className="w-12 h-12 md:w-16 md:h-16 text-danger" />
                )}
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">
                    {totalItems === 0
                      ? 'Nenhum saldo do sistema importado'
                      : faltas === 0 && sobras === 0
                        ? '✅ Estoque 100% Conciliado'
                        : `⚠️ ${100 - healthPct}% do estoque com divergência`}
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    {totalItems === 0
                      ? 'Importe o saldo do sistema para iniciar a conciliação'
                      : `${okItems} OK · ${sobras} sobra · ${faltas} falta${semDado > 0 ? ` · ${semDado} sem dado` : ''}`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{okItems}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Itens OK</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-2" />
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{sobras}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Com Sobra</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <XCircle className="w-8 h-8 text-danger mx-auto mb-2" />
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{faltas}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Com Falta</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-lg md:text-2xl font-bold text-foreground">
                    R$ {totalDivergenciaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">Valor Divergências</p>
                </CardContent>
              </Card>
            </div>

            {/* Pie chart */}
            {pieData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base md:text-lg">Distribuição do Estoque</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* RECONCILIATION TAB */}
          <TabsContent value="conciliacao" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou código..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ok">OK</SelectItem>
                  <SelectItem value="sobra">Sobra</SelectItem>
                   <SelectItem value="falta">Falta</SelectItem>
                   <SelectItem value="sem_dado">Sem dado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredItems.length === 0 && totalItems === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-lg font-medium text-foreground">Nenhuma conciliação disponível</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Importe as saídas da semana e o saldo do sistema na aba "Importar" para começar.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="block md:hidden space-y-3">
                  {filteredItems.map(item => (
                    <Card key={item.material_id} className={`border-l-4 ${item.status === 'falta' ? 'border-l-danger' : item.status === 'sobra' ? 'border-l-warning' : item.status === 'sem_dado' ? 'border-l-muted' : 'border-l-success'}`}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-mono text-xs text-muted-foreground">{item.codigo}</p>
                            <p className="font-medium text-sm text-foreground">{item.material}</p>
                          </div>
                          {getStatusBadge(item.status)}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <p className="text-muted-foreground">Invex</p>
                            <p className="font-bold text-foreground">{item.saldo_invex}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Sistema</p>
                            <p className="font-bold text-foreground">{item.status === 'sem_dado' ? '—' : item.saldo_sistema}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Diverg.</p>
                            <p className={`font-bold ${item.divergencia > 0 ? 'text-warning' : item.divergencia < 0 ? 'text-danger' : 'text-success'}`}>
                              {item.divergencia > 0 ? '+' : ''}{item.divergencia}
                            </p>
                          </div>
                        </div>
                        {item.divergencia !== 0 && item.status !== 'sem_dado' && (
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-xs text-muted-foreground">
                              Valor: R$ {Math.abs(item.divergencia_valor).toFixed(2)}
                            </span>
                            <Button size="sm" variant="outline" onClick={() => { setAdjustItem(item); setAdjustDialogOpen(true); }}>
                              <Wrench className="w-3 h-3 mr-1" /> Ajustar
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop table */}
                <Card className="hidden md:block">
                  <CardContent className="p-0">
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Material</TableHead>
                            <TableHead className="text-right">Saldo Invex</TableHead>
                            <TableHead className="text-right">Saldo Sistema</TableHead>
                            <TableHead className="text-right">Divergência</TableHead>
                            <TableHead className="text-right">Valor Div.</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredItems.map(item => (
                            <TableRow key={item.material_id} className={item.status === 'falta' ? 'bg-danger/5' : item.status === 'sobra' ? 'bg-warning/5' : item.status === 'sem_dado' ? 'bg-muted/30' : ''}>
                              <TableCell className="font-mono">{item.codigo}</TableCell>
                              <TableCell>{item.material}</TableCell>
                              <TableCell className="text-right">{item.saldo_invex}</TableCell>
                              <TableCell className="text-right">{item.status === 'sem_dado' ? '—' : item.saldo_sistema}</TableCell>
                              <TableCell className="text-right font-bold">
                                {item.status === 'sem_dado' ? '—' : `${item.divergencia > 0 ? '+' : ''}${item.divergencia}`}
                              </TableCell>
                              <TableCell className="text-right">{item.status === 'sem_dado' ? '—' : `R$ ${Math.abs(item.divergencia_valor).toFixed(2)}`}</TableCell>
                              <TableCell>{getStatusBadge(item.status)}</TableCell>
                              <TableCell>
                                {item.status !== 'ok' && item.status !== 'sem_dado' && (
                                  <Button size="sm" variant="outline" onClick={() => { setAdjustItem(item); setAdjustDialogOpen(true); }}>
                                    <Wrench className="w-3 h-3 mr-1" /> Ajustar
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          {filteredItems.length === 0 && (
                            <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum item encontrado</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* IMPORT TAB */}
          <TabsContent value="importar" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setImportMode('saida'); setImportDialogOpen(true); }}>
                <CardContent className="p-4 md:p-6 flex items-center gap-4">
                  <Upload className="w-8 h-8 md:w-10 md:h-10 text-danger shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm md:text-base">Importar Saídas</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">CSV/XLSX com saídas da semana (codigo, quantidade)</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setImportMode('saldo_sistema'); setImportDialogOpen(true); }}>
                <CardContent className="p-4 md:p-6 flex items-center gap-4">
                  <Upload className="w-8 h-8 md:w-10 md:h-10 text-primary shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm md:text-base">Importar Saldo do Sistema</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">CSV/XLSX com saldo da clínica (codigo, saldo_sistema)</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Batch list */}
            <Card>
              <CardHeader><CardTitle className="text-base md:text-lg">Lotes Importados</CardTitle></CardHeader>
              <CardContent>
                {batches.length > 0 ? (
                  <>
                    {/* Mobile batch cards */}
                    <div className="block md:hidden space-y-3">
                      {batches.map(b => (
                        <div key={`${b.lote}-${b.tipo}`} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-mono text-sm">{b.lote}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{b.tipo === 'saida' ? 'Saídas' : 'Saldo Sistema'}</Badge>
                              <span className="text-xs text-muted-foreground">{b.count} registros</span>
                            </div>
                          </div>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteBatch(b.lote, b.tipo)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lote</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Registros</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batches.map(b => (
                            <TableRow key={`${b.lote}-${b.tipo}`}>
                              <TableCell className="font-mono">{b.lote}</TableCell>
                              <TableCell><Badge variant="outline">{b.tipo === 'saida' ? 'Saídas' : 'Saldo Sistema'}</Badge></TableCell>
                              <TableCell>{b.count}</TableCell>
                              <TableCell>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteBatch(b.lote, b.tipo)}>
                                  <Trash2 className="w-3 h-3 mr-1" /> Desfazer
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Nenhum lote importado</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {importMode === 'saida' ? 'Importar Saídas da Semana' : 'Importar Saldo do Sistema'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {importMode === 'saida'
                ? 'Upload de arquivo CSV/XLSX com colunas: codigo e quantidade'
                : 'Upload de arquivo CSV/XLSX com colunas: codigo e saldo_sistema (ou saldo)'}
            </p>
            <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
            {importData.length > 0 && (
              <>
                <p className="text-sm font-medium">{importData.length} linhas encontradas</p>
                <div className="space-y-2">
                  <Label>Identificador do Lote</Label>
                  <Input value={importLote} onChange={e => setImportLote(e.target.value)} />
                </div>
                <div className="max-h-48 overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(importData[0]).map(k => <TableHead key={k}>{k}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importData.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).map((v, j) => <TableCell key={j}>{String(v)}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportData([]); }}>Cancelar</Button>
            <Button onClick={handleProcessImport} disabled={importData.length === 0}>
              {importMode === 'saida' ? 'Importar e Aplicar Saídas' : 'Importar Saldos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuste de Conciliação</DialogTitle>
          </DialogHeader>
          {adjustItem && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{adjustItem.material}</p>
                <p className="text-sm text-muted-foreground">
                  Saldo Invex: {adjustItem.saldo_invex} · Saldo Sistema: {adjustItem.saldo_sistema} · Divergência: {adjustItem.divergencia > 0 ? '+' : ''}{adjustItem.divergencia}
                </p>
              </div>
              <p className="text-sm">
                O estoque do Invex será ajustado de <strong>{adjustItem.saldo_invex}</strong> para <strong>{adjustItem.saldo_sistema}</strong> (saldo do sistema).
              </p>
              <div className="space-y-2">
                <Label>Motivo do Ajuste *</Label>
                <Textarea value={adjustMotivo} onChange={e => setAdjustMotivo(e.target.value)} placeholder="Informe o motivo do ajuste" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdjust} disabled={!adjustMotivo}>Confirmar Ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Conciliacao;
