import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, ArrowUpCircle, ArrowDownCircle, CheckCircle, ClipboardCheck, Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface RecountItem {
  material_id: string;
  codigo: string;
  material: string;
  unidade: string;
  preco: number;
  saldo_invex: number;
  saldo_sistema: number;
  divergencia: number;
  status: 'sobra' | 'falta';
  nova_contagem: number | null;
}

const Recontagem = () => {
  const [items, setItems] = useState<RecountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'sobra' | 'falta'>('todos');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState<RecountItem | null>(null);
  const [confirmObs, setConfirmObs] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .not('company_id', 'is', null)
        .limit(1)
        .single();

      if (!roleData?.company_id) return;
      setCompanyId(roleData.company_id);

      const { data: mats } = await supabase
        .from('materials')
        .select('id, codigo, material, quantidade, preco, unidade')
        .eq('company_id', roleData.company_id)
        .order('codigo');

      const { data: saldos } = await supabase
        .from('saldo_sistema_importado')
        .select('material_id, saldo_sistema, created_at')
        .eq('company_id', roleData.company_id)
        .order('created_at', { ascending: false });

      if (!mats) return;

      const latestSaldo = new Map<string, number>();
      (saldos || []).forEach(s => {
        if (!latestSaldo.has(s.material_id)) {
          latestSaldo.set(s.material_id, Number(s.saldo_sistema));
        }
      });

      const divergentItems: RecountItem[] = [];
      mats.forEach(m => {
        if (!latestSaldo.has(m.id)) return;
        const saldoInvex = Number(m.quantidade);
        const saldoSis = latestSaldo.get(m.id)!;
        const div = saldoInvex - saldoSis;
        if (div === 0) return;

        divergentItems.push({
          material_id: m.id,
          codigo: m.codigo,
          material: m.material,
          unidade: m.unidade,
          preco: Number(m.preco),
          saldo_invex: saldoInvex,
          saldo_sistema: saldoSis,
          divergencia: div,
          status: div > 0 ? 'sobra' : 'falta',
          nova_contagem: null,
        });
      });

      setItems(divergentItems);
    } catch (err) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        i.material.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [items, statusFilter, searchQuery]);

  const handleContagemChange = (materialId: string, value: string) => {
    const num = value === '' ? null : Number(value);
    setItems(prev => prev.map(i =>
      i.material_id === materialId ? { ...i, nova_contagem: num } : i
    ));
  };

  const handleSaveRecount = (item: RecountItem) => {
    if (item.nova_contagem === null || item.nova_contagem < 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }
    setConfirmItem(item);
    setConfirmObs('');
    setConfirmOpen(true);
  };

  const confirmSaveRecount = async () => {
    if (!confirmItem || !companyId || !userId) return;
    if (confirmItem.nova_contagem === null) return;

    try {
      setSaving(true);

      // Save to contagem_fisica
      const { error: countError } = await supabase
        .from('contagem_fisica')
        .insert({
          company_id: companyId,
          material_id: confirmItem.material_id,
          quantidade_contada: confirmItem.nova_contagem,
          usuario_id: userId,
          obs: confirmObs || `Recontagem - divergência: ${confirmItem.status}`,
        });

      if (countError) throw countError;

      // Update material stock
      const { error: updateError } = await supabase
        .from('materials')
        .update({ quantidade: confirmItem.nova_contagem })
        .eq('id', confirmItem.material_id);

      if (updateError) throw updateError;

      // Log the movement
      const { error: movError } = await supabase
        .from('stock_movements')
        .insert({
          company_id: companyId,
          material_id: confirmItem.material_id,
          quantidade: Math.abs(confirmItem.nova_contagem - confirmItem.saldo_invex),
          tipo: confirmItem.nova_contagem > confirmItem.saldo_invex ? 'entrada' : 'saida',
          user_id: userId,
          obs: `Recontagem: ${confirmObs || 'Ajuste pós-conciliação'}`,
        });

      if (movError) throw movError;

      toast.success(`Recontagem de "${confirmItem.material}" salva com sucesso`);
      setConfirmOpen(false);
      setConfirmItem(null);
      await loadData();
    } catch {
      toast.error('Erro ao salvar recontagem');
    } finally {
      setSaving(false);
    }
  };

  const sobraCount = items.filter(i => i.status === 'sobra').length;
  const faltaCount = items.filter(i => i.status === 'falta').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Recontagem de Estoque</h1>
          <p className="text-muted-foreground text-sm mt-1">Itens com divergência na conciliação para recontagem física</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card
            className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'todos' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter('todos')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase">Total</span>
                <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">{items.length}</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'sobra' ? 'ring-2 ring-warning' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'sobra' ? 'todos' : 'sobra')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase">Sobra</span>
                <ArrowUpCircle className="w-4 h-4 text-warning" />
              </div>
              <p className="text-2xl font-bold text-foreground">{sobraCount}</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'falta' ? 'ring-2 ring-destructive' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'falta' ? 'todos' : 'falta')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase">Falta</span>
                <ArrowDownCircle className="w-4 h-4 text-destructive" />
              </div>
              <p className="text-2xl font-bold text-foreground">{faltaCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou material..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-lg font-semibold text-foreground">Nenhuma divergência encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">Todos os itens estão conciliados ou nenhum filtro corresponde.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="block md:hidden space-y-3">
              {filteredItems.map(item => (
                <Card key={item.material_id} className="border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-muted-foreground">{item.codigo}</p>
                        <p className="font-semibold text-sm text-foreground truncate">{item.material}</p>
                      </div>
                      <Badge variant={item.status === 'falta' ? 'destructive' : 'warning'} className="shrink-0">
                        {item.status === 'falta' ? 'Falta' : 'Sobra'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Invex</p>
                        <p className="font-bold text-foreground">{item.saldo_invex}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Sistema</p>
                        <p className="font-bold text-foreground">{item.saldo_sistema}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Diverg.</p>
                        <p className={`font-bold ${item.status === 'falta' ? 'text-destructive' : 'text-warning'}`}>
                          {item.divergencia > 0 ? '+' : ''}{item.divergencia}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder="Nova contagem"
                        value={item.nova_contagem ?? ''}
                        onChange={e => handleContagemChange(item.material_id, e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveRecount(item)}
                        disabled={item.nova_contagem === null}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-center">Saldo Invex</TableHead>
                        <TableHead className="text-center">Saldo Sistema</TableHead>
                        <TableHead className="text-center">Divergência</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Nova Contagem</TableHead>
                        <TableHead className="text-center">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map(item => (
                        <TableRow key={item.material_id}>
                          <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                          <TableCell className="font-medium text-sm max-w-[200px] truncate">{item.material}</TableCell>
                          <TableCell className="text-center">{item.saldo_invex}</TableCell>
                          <TableCell className="text-center">{item.saldo_sistema}</TableCell>
                          <TableCell className={`text-center font-bold ${item.status === 'falta' ? 'text-destructive' : 'text-warning'}`}>
                            {item.divergencia > 0 ? '+' : ''}{item.divergencia}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={item.status === 'falta' ? 'destructive' : 'warning'}>
                              {item.status === 'falta' ? 'Falta' : 'Sobra'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min={0}
                              placeholder="Qtd"
                              value={item.nova_contagem ?? ''}
                              onChange={e => handleContagemChange(item.material_id, e.target.value)}
                              className="w-24 mx-auto text-center"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveRecount(item)}
                              disabled={item.nova_contagem === null}
                            >
                              <Save className="w-4 h-4 mr-1" /> Salvar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Recontagem</DialogTitle>
          </DialogHeader>
          {confirmItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Material</p>
                  <p className="font-semibold text-foreground">{confirmItem.material}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Código</p>
                  <p className="font-semibold text-foreground">{confirmItem.codigo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Saldo atual (Invex)</p>
                  <p className="font-semibold text-foreground">{confirmItem.saldo_invex}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nova contagem</p>
                  <p className="font-semibold text-primary">{confirmItem.nova_contagem}</p>
                </div>
              </div>
              <div>
                <Label>Observação (opcional)</Label>
                <Textarea
                  placeholder="Ex: Recontagem física realizada no almoxarifado..."
                  value={confirmObs}
                  onChange={e => setConfirmObs(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmSaveRecount} disabled={saving}>
              {saving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Recontagem;
