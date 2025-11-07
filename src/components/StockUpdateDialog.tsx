import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InventoryItem } from '@/hooks/useInventoryData';
import { useToast } from '@/hooks/use-toast';

interface StockUpdateDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (codigo: string, quantidade: number) => Promise<void>;
}

const ENDPOINT = 'https://script.google.com/macros/s/AKfycbye4S7AiCk04k3LRyIWhWhgr_mmxRkI7n1mHa7sQi9_fsy-uqgjB-Es4GCjumCPyAI/exec';

export const StockUpdateDialog = ({ item, open, onOpenChange, onUpdate }: StockUpdateDialogProps) => {
  const [quantidade, setQuantidade] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setLoading(true);
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          codigo: item.codigo.toString(),
          quantidade: Number(quantidade),
        }),
      });

      const result = await response.json();

      if (result.ok) {
        toast({
          title: "✅ Estoque atualizado com sucesso!",
          description: `${item.material} - Nova quantidade: ${quantidade}`,
        });
        await onUpdate(item.codigo, Number(quantidade));
        setQuantidade('');
        onOpenChange(false);
      } else {
        toast({
          title: "Erro ao atualizar",
          description: result.message || "Não foi possível atualizar o estoque.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor.",
        variant: "destructive",
      });
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
