import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InventoryItem } from '@/hooks/useInventoryData';

interface StockUpdateDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (codigo: string, quantidade: number) => Promise<void>;
}

export const StockUpdateDialog = ({ item, open, onOpenChange, onUpdate }: StockUpdateDialogProps) => {
  const [quantidade, setQuantidade] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setLoading(true);
    try {
      await onUpdate(item.codigo, Number(quantidade));
      setQuantidade('');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Atualizar Estoque</DialogTitle>
            <DialogDescription>
              {item?.material} - Código: {item?.codigo}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="quantidade">Nova Quantidade</Label>
              <Input
                id="quantidade"
                type="number"
                min="0"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder={`Atual: ${item?.quantidade}`}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
