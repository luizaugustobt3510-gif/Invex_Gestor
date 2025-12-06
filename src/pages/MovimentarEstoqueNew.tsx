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
import { useInventoryData, InventoryItem } from '@/hooks/useInventoryData';
import { api, MovementItem } from '@/services/api';
import { TrendingUp, TrendingDown, Plus, Trash2, Send, Search, Check } from 'lucide-react';

const MovimentarEstoqueNew = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: inventoryData, loading: inventoryLoading } = useInventoryData();
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [obs, setObs] = useState('');

  const [itens, setItens] = useState<(MovementItem & { material?: string })[]>([]);

  const filteredItems = searchTerm.length >= 1 
    ? inventoryData.filter(item => 
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.material.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const selectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setSearchTerm('');
  };

  const addItem = () => {
    if (!selectedItem || !quantidade) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione um item e informe a quantidade.',
        variant: 'destructive',
      });
      return;
    }

    const exists = itens.some(i => i.codigo === selectedItem.codigo);
    if (exists) {
      toast({
        title: 'Item já adicionado',
        description: 'Este item já está na lista.',
        variant: 'destructive',
      });
      return;
    }

    setItens(prev => [...prev, { 
      codigo: selectedItem.codigo, 
      quantidade, 
      obs,
      material: selectedItem.material 
    }]);
    setSelectedItem(null);
    setQuantidade('');
    setObs('');
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
      const movementItems = itens.map(({ codigo, quantidade, obs }) => ({ codigo, quantidade, obs }));
      const response = await api.movimentarEstoque(user.email, tipo, movementItems);

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
      <Card className="max-w-4xl mx-auto">
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

          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold">Selecionar Item</h3>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredItems.length > 0 && !selectedItem && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {filteredItems.slice(0, 10).map((item) => (
                  <div
                    key={item.codigo}
                    onClick={() => selectItem(item)}
                    className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                  >
                    <div>
                      <span className="font-mono text-sm">{item.codigo}</span>
                      <span className="mx-2">-</span>
                      <span className="font-medium">{item.material}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Qtd: {item.quantidade}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedItem && (
              <div className="p-3 bg-primary/10 rounded-lg flex items-center justify-between">
                <div>
                  <Check className="w-4 h-4 inline mr-2 text-primary" />
                  <span className="font-mono">{selectedItem.codigo}</span>
                  <span className="mx-2">-</span>
                  <span className="font-medium">{selectedItem.material}</span>
                  <span className="text-sm text-muted-foreground ml-2">(Estoque: {selectedItem.quantidade})</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
                  Trocar
                </Button>
              </div>
            )}

            {selectedItem && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade *</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Observação</Label>
                  <Textarea
                    placeholder="Observação (opcional)"
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    className="min-h-[40px]"
                  />
                </div>
              </div>
            )}

            {selectedItem && (
              <Button onClick={addItem} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Adicionar à Lista
              </Button>
            )}
          </div>

          {itens.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{item.codigo}</TableCell>
                      <TableCell>{item.material || '-'}</TableCell>
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

          <Button onClick={handleSubmit} className="w-full gap-2" disabled={loading || inventoryLoading}>
            <Send className="w-4 h-4" />
            {loading ? 'Enviando...' : `Registrar ${tipo === 'entrada' ? 'Entrada' : 'Saída'}`}
          </Button>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default MovimentarEstoqueNew;
