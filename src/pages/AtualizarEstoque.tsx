import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useInventoryData, InventoryItem } from '@/hooks/useInventoryData';
import { EditMaterialDialog } from '@/components/EditMaterialDialog';
import { Package, Save, Search, RefreshCw, Edit, Trash2 } from 'lucide-react';
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

  const filteredItems = inventoryData
    .filter(item =>
      String(item.codigo).toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.material).toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'material') {
        return String(a.material).localeCompare(String(b.material), 'pt-BR', { sensitivity: 'base' });
      }
      return String(a.codigo).localeCompare(String(b.codigo), 'pt-BR', { numeric: true, sensitivity: 'base' });
    });

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

          {inventoryLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum item encontrado.</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
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
                    <TableRow key={item.codigo}>
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
    </MainLayout>
  );
};

export default AtualizarEstoque;
