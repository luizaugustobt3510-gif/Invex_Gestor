import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InventoryItem } from '@/hooks/useInventoryData';
import { MaterialGroupSelect } from '@/components/MaterialGroupSelect';
import { dbErrorMessage } from '@/lib/dbErrors';
import { useMaterialGroups } from '@/hooks/useMaterialGroups';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditMaterialDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const EditMaterialDialog = ({ item, open, onOpenChange, onSaved }: EditMaterialDialogProps) => {
  const [material, setMaterial] = useState('');
  const [minimo, setMinimo] = useState('');
  const [maximo, setMaximo] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('');
  const [validade, setValidade] = useState('');
  const [groupId, setGroupId] = useState<string>('');
  const [preco, setPreco] = useState('');
  const [tipo, setTipo] = useState('comum');
  const [loading, setLoading] = useState(false);
  const { groups, createGroup, loading: loadingGroups } = useMaterialGroups();

  useEffect(() => {
    if (item) {
      setMaterial(item.material);
      setMinimo(String(item.minimo));
      setMaximo(String(item.maximo));
      setQuantidade(String(item.quantidade));
      setUnidade(item.unidade || 'UNIDADE');
      setValidade(item.validade ? String(item.validade).slice(0, 10) : '');
      setGroupId(item.groupId || '');
      setPreco(String(item.preco ?? 0));
      setTipo(item.tipo || 'comum');
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    if (!material.trim()) { toast.error('Nome do material é obrigatório.'); return; }
    const numMin = Number(minimo);
    const numMax = Number(maximo);
    const numQtd = Number(quantidade);
    const numPreco = Number(String(preco).replace(',', '.'));

    if (isNaN(numMin) || numMin < 0) { toast.error('Mínimo inválido.'); return; }
    if (isNaN(numMax) || numMax < 0) { toast.error('Máximo inválido.'); return; }
    if (isNaN(numQtd) || numQtd < 0) { toast.error('Quantidade inválida.'); return; }
    if (isNaN(numPreco) || numPreco < 0) { toast.error('Preço inválido.'); return; }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('materials')
        .update({
          material: material.trim(),
          minimo: numMin,
          maximo: numMax,
          quantidade: numQtd,
          unidade: unidade.trim() || 'UNIDADE',
          validade: validade || null,
          group_id: groupId || null,
          preco: numPreco,
          tipo,
        } as any)
        .eq('id', item.id);

      if (error) throw error;

      // Audit log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_log').insert({
          user_id: user.id,
          action: 'update_material',
          entity_type: 'material',
          entity_id: item.id,
          details: { codigo: item.codigo, changes: { material: material.trim(), minimo: numMin, maximo: numMax, quantidade: numQtd, unidade: unidade.trim(), preco: numPreco, tipo } },
        });
      }

      toast.success('Material atualizado com sucesso!');
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(dbErrorMessage(err, 'Erro ao atualizar material.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Material — {item?.codigo}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Nome do Material</Label>
              <Input value={material} onChange={(e) => setMaterial(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="UNIDADE" />
              </div>
              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input type="number" step="0.01" min="0" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0,00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => v && setTipo(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comum">Material comum</SelectItem>
                  <SelectItem value="materia_prima">Matéria-prima (usada na produção)</SelectItem>
                  <SelectItem value="produto_final">Produto final (produzido, para venda)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Grupo</Label>
                <MaterialGroupSelect value={groupId} onChange={setGroupId} groups={groups} loading={loadingGroups} createGroup={createGroup} />
              </div>
              <div className="space-y-2">
                <Label>Validade</Label>
                <Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Mínimo</Label>
                <Input type="number" min="0" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Máximo</Label>
                <Input type="number" min="0" value={maximo} onChange={(e) => setMaximo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input type="number" min="0" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
