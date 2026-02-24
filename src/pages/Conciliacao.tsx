import { useState, useEffect, useMemo } from 'react';
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
import { CheckCircle, AlertTriangle, XCircle, ClipboardCheck, Upload, BarChart3, Search, Trash2, Wrench } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as XLSX from 'xlsx';

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
  saldo_fisico: number;
  total_entradas: number;
  total_saidas: number;
  saldo_teorico: number;
  divergencia: number;
  divergencia_valor: number;
  status: 'ok' | 'sobra' | 'falta';
}

const Conciliacao = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Physical count state
  const [countDialogOpen, setCountDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [countQty, setCountQty] = useState('');
  const [countObs, setCountObs] = useState('');

  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importType, setImportType] = useState<'entrada' | 'saida'>('entrada');
  const [importData, setImportData] = useState<any[]>([]);
  const [importLote, setImportLote] = useState('');

  // Adjust state
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<ReconciliationItem | null>(null);
  const [adjustMotivo, setAdjustMotivo] = useState('');

  // Imported batches
  const [batches, setBatches] = useState<{lote: string; count: number; tipo: string}[]>([]);

  useEffect(() => {
    loadData();
  }, []);

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

      // Load materials, physical counts, and imported movements
      const [matRes, countRes, importRes] = await Promise.all([
        supabase.from('materials').select('*').eq('company_id', roleData.company_id).order('codigo'),
        supabase.from('contagem_fisica').select('*').eq('company_id', roleData.company_id).order('data_contagem', { ascending: false }),
        supabase.from('movimentacoes_importadas').select('*').eq('company_id', roleData.company_id),
      ]);

      const mats = (matRes.data || []) as Material[];
      setMaterials(mats);

      // Build reconciliation view
      const counts = countRes.data || [];
      const imports = importRes.data || [];

      const reconItems: ReconciliationItem[] = mats.map(m => {
        // Last physical count for this material
        const lastCount = counts.find((c: any) => c.material_id === m.id);
        const lastCountDate = lastCount ? new Date(lastCount.data_contagem) : new Date(0);
        const saldoFisico = lastCount ? Number(lastCount.quantidade_contada) : Number(m.quantidade);

        // Imported movements since last count
        const movsSince = imports.filter((mov: any) =>
          mov.material_id === m.id && new Date(mov.data) >= lastCountDate
        );

        const totalEntradas = movsSince
          .filter((mov: any) => mov.tipo === 'entrada')
          .reduce((s: number, mov: any) => s + Number(mov.quantidade), 0);

        const totalSaidas = movsSince
          .filter((mov: any) => mov.tipo === 'saida')
          .reduce((s: number, mov: any) => s + Number(mov.quantidade), 0);

        const saldoTeorico = saldoFisico + totalEntradas - totalSaidas;
        const estoqueAtual = Number(m.quantidade);
        const divergencia = estoqueAtual - saldoTeorico;

        let status: 'ok' | 'sobra' | 'falta' = 'ok';
        if (divergencia > 0) status = 'sobra';
        else if (divergencia < 0) status = 'falta';

        return {
          material_id: m.id,
          codigo: m.codigo,
          material: m.material,
          unidade: m.unidade,
          preco: Number(m.preco),
          saldo_fisico: estoqueAtual,
          total_entradas: totalEntradas,
          total_saidas: totalSaidas,
          saldo_teorico: saldoTeorico,
          divergencia,
          divergencia_valor: divergencia * Number(m.preco),
          status,
        };
      });

      setReconciliation(reconItems);

      // Build batch list
      const batchMap = new Map<string, { count: number; tipo: string }>();
      imports.forEach((mov: any) => {
        const key = mov.lote_importacao;
        if (!batchMap.has(key)) batchMap.set(key, { count: 0, tipo: mov.tipo });
        batchMap.get(key)!.count++;
      });
      setBatches(Array.from(batchMap.entries()).map(([lote, v]) => ({ lote, ...v })));

    } catch (err) {
      toast.error('Erro ao carregar dados de conciliação');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    let items = reconciliation;
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
  const totalItems = reconciliation.length;
  const divergentItems = reconciliation.filter(i => i.status !== 'ok').length;
  const okItems = totalItems - divergentItems;
  const healthPct = totalItems > 0 ? Math.round((okItems / totalItems) * 100) : 100;
  const sobras = reconciliation.filter(i => i.status === 'sobra').length;
  const faltas = reconciliation.filter(i => i.status === 'falta').length;

  const pieData = [
    { name: 'OK', value: okItems, color: 'hsl(142, 76%, 36%)' },
    { name: 'Sobra', value: sobras, color: 'hsl(38, 92%, 50%)' },
    { name: 'Falta', value: faltas, color: 'hsl(0, 72%, 51%)' },
  ].filter(d => d.value > 0);

  const top10Divergent = [...reconciliation]
    .sort((a, b) => Math.abs(b.divergencia_valor) - Math.abs(a.divergencia_valor))
    .slice(0, 10)
    .filter(i => i.divergencia !== 0);

  // Physical count
  const handleSaveCount = async () => {
    if (!selectedMaterial || !companyId) return;
    const qty = Number(countQty);
    if (isNaN(qty) || qty < 0) { toast.error('Quantidade inválida'); return; }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('contagem_fisica').insert({
        company_id: companyId,
        material_id: selectedMaterial.id,
        quantidade_contada: qty,
        usuario_id: user.id,
        obs: countObs,
      });

      toast.success('Contagem registrada!');
      setCountDialogOpen(false);
      setCountQty('');
      setCountObs('');
      loadData();
    } catch {
      toast.error('Erro ao registrar contagem');
    }
  };

  // Import file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);
        setImportData(json);
        const now = new Date();
        setImportLote(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-semana-${Math.ceil(now.getDate() / 7)}`);
      } catch {
        toast.error('Erro ao ler arquivo');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleProcessImport = async () => {
    if (!companyId || importData.length === 0 || !importLote) return;

    try {
      const rows = importData.map((row: any) => {
        const codigo = String(row.codigo || row.Codigo || row.CODIGO || '').trim();
        const quantidade = Number(row.quantidade || row.Quantidade || row.QUANTIDADE || 0);
        const mat = materials.find(m => m.codigo === codigo);
        return { codigo, quantidade, material_id: mat?.id };
      }).filter(r => r.material_id && r.quantidade > 0);

      if (rows.length === 0) { toast.error('Nenhum produto válido encontrado'); return; }

      const inserts = rows.map(r => ({
        company_id: companyId,
        material_id: r.material_id!,
        tipo: importType,
        quantidade: r.quantidade,
        lote_importacao: importLote,
        data: new Date().toISOString(),
      }));

      const { error } = await supabase.from('movimentacoes_importadas').insert(inserts);
      if (error) throw error;

      toast.success(`${rows.length} movimentações importadas!`);
      setImportDialogOpen(false);
      setImportData([]);
      loadData();
    } catch {
      toast.error('Erro ao importar movimentações');
    }
  };

  const handleDeleteBatch = async (lote: string) => {
    if (!companyId) return;
    try {
      const { error } = await supabase
        .from('movimentacoes_importadas')
        .delete()
        .eq('company_id', companyId)
        .eq('lote_importacao', lote);
      if (error) throw error;
      toast.success('Lote removido!');
      loadData();
    } catch {
      toast.error('Erro ao remover lote');
    }
  };

  // Manual adjust
  const handleAdjust = async () => {
    if (!adjustItem || !companyId || !adjustMotivo) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update material quantity to match theoretical
      await supabase.from('materials').update({ quantidade: adjustItem.saldo_teorico }).eq('id', adjustItem.material_id);

      // Log
      await supabase.from('conciliacao_log').insert({
        company_id: companyId,
        material_id: adjustItem.material_id,
        saldo_fisico: adjustItem.saldo_fisico,
        saldo_teorico: adjustItem.saldo_teorico,
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
      default: return null;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <ClipboardCheck className="w-8 h-8 text-primary" />
          Conciliação de Estoque
        </h1>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="analise">Análise</TabsTrigger>
            <TabsTrigger value="importar">Importar</TabsTrigger>
            <TabsTrigger value="contagem">Contagem</TabsTrigger>
          </TabsList>

          {/* DASHBOARD TAB */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Health Indicator */}
            <Card className={`border-2 ${divergentItems === 0 ? 'border-success' : healthPct >= 80 ? 'border-warning' : 'border-danger'}`}>
              <CardContent className="p-6 flex items-center gap-6">
                {divergentItems === 0 ? (
                  <CheckCircle className="w-16 h-16 text-success" />
                ) : healthPct >= 80 ? (
                  <AlertTriangle className="w-16 h-16 text-warning" />
                ) : (
                  <XCircle className="w-16 h-16 text-danger" />
                )}
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {divergentItems === 0
                      ? '✅ Estoque 100% Conciliado'
                      : `⚠️ ${100 - healthPct}% do estoque com divergência`}
                  </h2>
                  <p className="text-muted-foreground">
                    {okItems} produtos OK · {sobras} com sobra · {faltas} com falta
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Pie */}
              <Card>
                <CardHeader><CardTitle>Status do Estoque</CardTitle></CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                          {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Sem dados</p>
                  )}
                </CardContent>
              </Card>

              {/* Top 10 divergences */}
              <Card>
                <CardHeader><CardTitle>Top 10 Divergências por Valor</CardTitle></CardHeader>
                <CardContent>
                  {top10Divergent.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={top10Divergent} layout="vertical">
                        <XAxis type="number" tickFormatter={(v) => `R$ ${Math.abs(v).toFixed(0)}`} />
                        <YAxis type="category" dataKey="codigo" width={80} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                        <Bar dataKey="divergencia_valor" fill="hsl(0, 72%, 51%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Sem divergências</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ANALYSIS TAB */}
          <TabsContent value="analise" className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou código..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ok">OK</SelectItem>
                  <SelectItem value="sobra">Sobra</SelectItem>
                  <SelectItem value="falta">Falta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Estoque Atual</TableHead>
                        <TableHead className="text-right">Entradas Imp.</TableHead>
                        <TableHead className="text-right">Saídas Imp.</TableHead>
                        <TableHead className="text-right">Saldo Teórico</TableHead>
                        <TableHead className="text-right">Divergência</TableHead>
                        <TableHead className="text-right">Valor Div.</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map(item => (
                        <TableRow key={item.material_id} className={item.status === 'falta' ? 'bg-danger/5' : item.status === 'sobra' ? 'bg-warning/5' : ''}>
                          <TableCell className="font-mono">{item.codigo}</TableCell>
                          <TableCell>{item.material}</TableCell>
                          <TableCell className="text-right">{item.saldo_fisico}</TableCell>
                          <TableCell className="text-right">{item.total_entradas}</TableCell>
                          <TableCell className="text-right">{item.total_saidas}</TableCell>
                          <TableCell className="text-right">{item.saldo_teorico}</TableCell>
                          <TableCell className="text-right font-bold">{item.divergencia}</TableCell>
                          <TableCell className="text-right">R$ {item.divergencia_valor.toFixed(2)}</TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>
                            {item.status !== 'ok' && (
                              <Button size="sm" variant="outline" onClick={() => { setAdjustItem(item); setAdjustDialogOpen(true); }}>
                                <Wrench className="w-3 h-3 mr-1" /> Ajustar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredItems.length === 0 && (
                        <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum item encontrado</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* IMPORT TAB */}
          <TabsContent value="importar" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setImportType('entrada'); setImportDialogOpen(true); }}>
                <CardContent className="p-6 flex items-center gap-4">
                  <Upload className="w-10 h-10 text-success" />
                  <div>
                    <h3 className="font-semibold text-foreground">Importar Entradas</h3>
                    <p className="text-sm text-muted-foreground">CSV/XLSX com movimentações de entrada</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setImportType('saida'); setImportDialogOpen(true); }}>
                <CardContent className="p-6 flex items-center gap-4">
                  <Upload className="w-10 h-10 text-danger" />
                  <div>
                    <h3 className="font-semibold text-foreground">Importar Saídas</h3>
                    <p className="text-sm text-muted-foreground">CSV/XLSX com movimentações de saída</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Batch list */}
            <Card>
              <CardHeader><CardTitle>Lotes Importados</CardTitle></CardHeader>
              <CardContent>
                {batches.length > 0 ? (
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
                        <TableRow key={b.lote}>
                          <TableCell className="font-mono">{b.lote}</TableCell>
                          <TableCell><Badge variant="outline">{b.tipo}</Badge></TableCell>
                          <TableCell>{b.count}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteBatch(b.lote)}>
                              <Trash2 className="w-3 h-3 mr-1" /> Desfazer
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Nenhum lote importado</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PHYSICAL COUNT TAB */}
          <TabsContent value="contagem" className="space-y-4">
            <p className="text-muted-foreground">Selecione um material para registrar a contagem física.</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar material..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {materials
                .filter(m => !searchQuery || m.material.toLowerCase().includes(searchQuery.toLowerCase()) || m.codigo.includes(searchQuery))
                .map(m => (
                  <Card key={m.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setSelectedMaterial(m); setCountDialogOpen(true); }}>
                    <CardContent className="p-4">
                      <p className="font-mono text-sm text-muted-foreground">{m.codigo}</p>
                      <p className="font-medium text-foreground">{m.material}</p>
                      <p className="text-sm text-muted-foreground">Estoque: {m.quantidade} {m.unidade}</p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Physical Count Dialog */}
      <Dialog open={countDialogOpen} onOpenChange={setCountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Contagem Física</DialogTitle>
          </DialogHeader>
          {selectedMaterial && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedMaterial.material}</p>
                <p className="text-sm text-muted-foreground">Código: {selectedMaterial.codigo} · Estoque sistema: {selectedMaterial.quantidade}</p>
              </div>
              <div className="space-y-2">
                <Label>Quantidade Contada *</Label>
                <Input type="number" value={countQty} onChange={e => setCountQty(e.target.value)} min="0" />
              </div>
              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea value={countObs} onChange={e => setCountObs(e.target.value)} placeholder="Ex: Contagem inventário mensal" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCountDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCount}>Salvar Contagem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar {importType === 'entrada' ? 'Entradas' : 'Saídas'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload de arquivo CSV/XLSX com colunas: <strong>codigo</strong> e <strong>quantidade</strong>
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
            <Button onClick={handleProcessImport} disabled={importData.length === 0}>Processar Importação</Button>
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
                  Estoque atual: {adjustItem.saldo_fisico} · Teórico: {adjustItem.saldo_teorico} · Divergência: {adjustItem.divergencia}
                </p>
              </div>
              <p className="text-sm">O estoque será ajustado de <strong>{adjustItem.saldo_fisico}</strong> para <strong>{adjustItem.saldo_teorico}</strong>.</p>
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
