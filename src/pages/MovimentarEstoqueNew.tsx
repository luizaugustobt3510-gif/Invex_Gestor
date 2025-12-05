import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api, MovementItem } from '@/services/api';
import { TrendingUp, TrendingDown, Plus, Trash2, Send } from 'lucide-react';

const MovimentarEstoqueNew = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  
  const [currentItem, setCurrentItem] = useState<MovementItem>({
    codigo: '',
    quantidade: '',
    obs: '',
  });

  const [itens, setItens] = useState<MovementItem[]>([]);

  const addItem = () => {
    if (!currentItem.codigo || !currentItem.quantidade) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha código e quantidade.',
        variant: 'destructive',
      });
      return;
    }

    setItens(prev => [...prev, currentItem]);
    setCurrentItem({ codigo: '', quantidade: '', obs: '' });
  };

  const removeItem = (index: number) => {
    setItens(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (itens.length === 0) {
      toast({
        title: 'Adicione itens',
        description: 'Adicione pelo menos um item para movimentar.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.email) return;

    setLoading(true);
    try {
      const response = await api.movimentarEstoque(user.email, tipo, itens);

      if (response.ok) {
        toast({
          title: 'Sucesso!',
          description: response.msg || 'Movimentação registrada com sucesso.',
        });
        setItens([]);
      } else {
        toast({
          title: 'Erro',
          description: response.msg || 'Erro ao registrar movimentação.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao conectar com o servidor.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {tipo === 'entrada' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            Movimentar Estoque
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Tipo de Movimentação *</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as 'entrada' | 'saida')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Adicionar Item</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <Input
                placeholder="Código"
                value={currentItem.codigo}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, codigo: e.target.value }))}
              />
              <Input
                type="number"
                placeholder="Quantidade"
                value={currentItem.quantidade}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, quantidade: e.target.value }))}
              />
              <Textarea
                placeholder="Observação (opcional)"
                value={currentItem.obs}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, obs: e.target.value }))}
                className="min-h-[40px]"
              />
            </div>
            <Button onClick={addItem} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar Item
            </Button>
          </div>

          {itens.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.codigo}</TableCell>
                      <TableCell>{item.quantidade}</TableCell>
                      <TableCell>{item.obs || '-'}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removeItem(index)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Button onClick={handleSubmit} className="w-full gap-2" disabled={loading}>
            <Send className="w-4 h-4" />
            {loading ? 'Enviando...' : `Registrar ${tipo === 'entrada' ? 'Entrada' : 'Saída'}`}
          </Button>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default MovimentarEstoqueNew;
