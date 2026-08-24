import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useInventoryData, InventoryItem } from '@/hooks/useInventoryData';
import { EditMaterialDialog } from '@/components/EditMaterialDialog';
import { Package, Save, Search, RefreshCw, Edit, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AtualizarEstoque = () => {
  const { toast } = useToast();
  const { data: inventoryData, loading: inventoryLoading, refetch, updateStock } = useInventoryData();
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'codigo' | 'material'>('codigo');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkUnidade, setBulkUnidade] = useState('');
  const [bulkMinimo, setBulkMinimo] = useState('');
  const [bulkMaximo, setBulkMaximo] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    const initialQuantities: Record<string, string> = {};
    inventoryData.forEach(item => {
      initialQuantities[item.codigo] = String(item.quantidade);
    });
    setQuantities(initialQuantities);
  }, [inventoryData]);


  const handleQuantityChange = (codigo: string, value: string) => {
    setQuantities(prev => ({ ...prev, [codigo]: value }));
  };

  const handleSave = async (codigo: string) => {
    const quantidade = quantities[codigo];
    if (!quantidade || quantidade.trim() === '') {
      toast({ title: 'Campo obrigatório', description: 'Informe a quantidade.', variant: 'destructive' });
      return;
    }
    setSaving(codigo);
    try {
      const result = await updateStock(codigo, Number(quantidade));
      if (result.success) {
        toast({ title: 'Sucesso!', description: 'Estoque atualizado.' });
      }
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('materials').delete().eq('id', deleteItem.id);
      if (error) throw error;

      // Audit log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_log').insert({
          user_id: user.id,
          action: 'delete_material',
          entity_type: 'material',
          entity_id: deleteItem.id,
          details: { codigo: deleteItem.codigo, material: deleteItem.material },
        });
      }

      toast({ title: 'Material excluído com sucesso!' });
      setDeleteItem(null);
      refetch();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Erro ao excluir material.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const filteredItems = useMemo(() => inventoryData
    .filter(item =>
      String(item.codigo).toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.material).toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'material') {
        return String(a.material).localeCompare(String(b.material), 'pt-BR', { sensitivity: 'base' });
      }
      return String(a.codigo).localeCompare(String(b.codigo), 'pt-BR', { numeric: true, sensitivity: 'base' });
    }), [inventoryData, searchTerm, sortBy]);

  const selectedItems = useMemo(
    () => inventoryData.filter(i => selectedIds.includes(i.id)),
    [inventoryData, selectedIds]
  );
  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every(i => selectedIds.includes(i.id));

  const toggleItem = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    if (allFilteredSelected) {
      const ids = filteredItems.map(i => i.id);
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredItems.map(i => i.id)])));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .delete()
        .in('id', selectedIds)
        .select('id');
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_log').insert({
          user_id: user.id,
          action: 'bulk_delete_material',
          entity_type: 'material',
          entity_id: null,
          details: { ids: selectedIds, total: data?.length ?? 0 },
        });
      }

      toast({ title: `${data?.length ?? 0} material(is) excluído(s) com sucesso!` });
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      refetch();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Erro ao excluir materiais.', variant: 'destructive' });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkEdit = async () => {
    if (selectedIds.length === 0) return;
    const payload: Record<string, unknown> = {};
    if (bulkUnidade.trim()) payload.unidade = bulkUnidade.trim();
    if (bulkMinimo.trim() !== '') {
      const n = Number(bulkMinimo);
      if (isNaN(n) || n < 0) { toast({ title: 'Mínimo inválido.', variant: 'destructive' }); return; }
      payload.minimo = n;
    }
    if (bulkMaximo.trim() !== '') {
      const n = Number(bulkMaximo);
      if (isNaN(n) || n < 0) { toast({ title: 'Máximo inválido.', variant: 'destructive' }); return; }
      payload.maximo = n;
    }
    if (Object.keys(payload).length === 0) {
      toast({ title: 'Preencha ao menos um campo para aplicar.', variant: 'destructive' });
      return;
    }

    setBulkLoading(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .update(payload)
        .in('id', selectedIds)
        .select('id');
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_log').insert({
          user_id: user.id,
          action: 'bulk_update_material',
          entity_type: 'material',
          entity_id: null,
          details: { ids: selectedIds, changes: payload },
        });
      }

      toast({ title: `${data?.length ?? 0} material(is) atualizado(s)!` });
      setBulkEditOpen(false);
      setBulkUnidade(''); setBulkMinimo(''); setBulkMaximo('');
      refetch();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Erro ao atualizar materiais.', variant: 'destructive' });
    } finally {
      setBulkLoading(false);
    }
  };


  return (
    <MainLayout>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Atualizar Estoque
          </CardTitle>
          <Button variant="outline" size="sm" onClick={refetch} disabled={inventoryLoading}>
            <RefreshCw className={`w-4 h-4 ${inventoryLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por código ou material..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={sortBy} onValueChange={(v: 'codigo' | 'material') => setSortBy(v)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="codigo">Código (ID) ↑</SelectItem>
                <SelectItem value="material">Nome (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border bg-muted/40 p-3">
              <span className="text-sm font-medium flex-1">
                {selectedIds.length} material(is) selecionado(s)
              </span>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(true)}>
                  <Pencil className="w-4 h-4 mr-1" /> Editar selecionados
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Excluir selecionados
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                  Limpar seleção
                </Button>
              </div>
            </div>
          )}

          {inventoryLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum item encontrado.</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[44px]">
                      <Checkbox
                        checked={allFilteredSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Qtd Atual</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead className="text-right">Máximo</TableHead>
                    <TableHead className="w-[180px]">Nova Qtd</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.codigo} data-state={selectedIds.includes(item.id) ? 'selected' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                          aria-label={`Selecionar ${item.material}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono">{item.codigo}</TableCell>
                      <TableCell className="font-medium max-w-xs truncate">{item.material}</TableCell>
                      <TableCell>{item.unidade}</TableCell>

                      <TableCell className="text-right">{item.quantidade}</TableCell>
                      <TableCell className="text-right">{item.minimo}</TableCell>
                      <TableCell className="text-right">{item.maximo}</TableCell>
                      <TableCell>
                        <Input type="number" inputMode="numeric" value={quantities[item.codigo] ?? ''} onChange={(e) => handleQuantityChange(item.codigo, e.target.value)} className="w-full min-w-[140px] h-11 text-base" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" onClick={() => handleSave(item.codigo)} disabled={saving === item.codigo} title="Salvar quantidade">
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditItem(item)} title="Editar material">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteItem(item)} title="Excluir material" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Material Dialog */}
      <EditMaterialDialog
        item={editItem}
        open={!!editItem}
        onOpenChange={(open) => { if (!open) setEditItem(null); }}
        onSaved={refetch}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteItem} onOpenChange={(open) => { if (!open) setDeleteItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Material</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o material <strong>{deleteItem?.material}</strong> (Código: {deleteItem?.codigo})?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir {selectedIds.length} material(is)</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Os materiais abaixo serão excluídos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto rounded-md border p-2 text-sm space-y-1">
            {selectedItems.map(i => (
              <div key={i.id} className="truncate">{i.codigo} — {i.material}</div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkLoading}>
              {bulkLoading ? 'Excluindo...' : 'Excluir todos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {selectedIds.length} material(is)</DialogTitle>
            <DialogDescription>
              Preencha apenas os campos que deseja aplicar a todos os selecionados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Input value={bulkUnidade} onChange={(e) => setBulkUnidade(e.target.value)} placeholder="Deixe vazio para não alterar" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Mínimo</Label>
                <Input type="number" min="0" value={bulkMinimo} onChange={(e) => setBulkMinimo(e.target.value)} placeholder="—" />
              </div>
              <div className="space-y-2">
                <Label>Máximo</Label>
                <Input type="number" min="0" value={bulkMaximo} onChange={(e) => setBulkMaximo(e.target.value)} placeholder="—" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleBulkEdit} disabled={bulkLoading}>
              {bulkLoading ? 'Aplicando...' : 'Aplicar a todos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>

  );
};

export default AtualizarEstoque;
