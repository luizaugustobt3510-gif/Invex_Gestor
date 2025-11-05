import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useInventoryData } from '@/hooks/useInventoryData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ArrowDown, ArrowUp, Save, Search, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface MovementItem {
  codigo: string;
  material: string;
  quantidade: string;
  obs: string;
}

const StockMovement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, movimentarEstoque } = useInventoryData();
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  const [searchTerm, setSearchTerm] = useState('');
  const [movementList, setMovementList] = useState<MovementItem[]>([]);
  const [loading, setLoading] = useState(false);

  if (!user?.admin) {
    navigate('/');
    return null;
  }

  const filteredProducts = data.filter(item =>
    item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.material.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToMovementList = (item: typeof data[0]) => {
    if (movementList.some(m => m.codigo === item.codigo)) {
      toast.error('Item já adicionado à lista');
      return;
    }

    setMovementList([...movementList, {
      codigo: item.codigo,
      material: item.material,
      quantidade: '1',
      obs: ''
    }]);
    toast.success('Item adicionado à lista');
    setSearchTerm('');
  };

  const removeFromList = (codigo: string) => {
    setMovementList(movementList.filter(item => item.codigo !== codigo));
  };

  const updateItem = (codigo: string, field: 'quantidade' | 'obs', value: string) => {
    setMovementList(movementList.map(item =>
      item.codigo === codigo ? { ...item, [field]: value } : item
    ));
  };

  const handleConfirm = async () => {
    if (movementList.length === 0) {
      toast.error('Adicione itens à lista antes de confirmar');
      return;
    }

    const hasInvalidQuantity = movementList.some(item => !item.quantidade || Number(item.quantidade) <= 0);
    if (hasInvalidQuantity) {
      toast.error('Todas as quantidades devem ser maiores que zero');
      return;
    }

    setLoading(true);
    const result = await movimentarEstoque(user.nome, tipo, movementList);
    
    if (result.success) {
      setMovementList([]);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold">Movimentar Estoque</h1>
          </div>
        </div>

        {/* Seleção de Tipo */}
        <div className="flex gap-4">
          <Button
            size="lg"
            variant={tipo === 'entrada' ? 'default' : 'outline'}
            onClick={() => setTipo('entrada')}
            className="flex-1"
          >
            <ArrowDown className="w-5 h-5 mr-2" />
            Entrada de Materiais
          </Button>
          <Button
            size="lg"
            variant={tipo === 'saida' ? 'default' : 'outline'}
            onClick={() => setTipo('saida')}
            className="flex-1"
          >
            <ArrowUp className="w-5 h-5 mr-2" />
            Saída de Materiais
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Busca de Produtos */}
          <Card>
            <CardHeader>
              <CardTitle>Buscar Produtos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="max-h-96 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Qtd Atual</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.slice(0, 20).map((item) => (
                      <TableRow key={item.codigo}>
                        <TableCell className="font-medium">{item.codigo}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.material}</TableCell>
                        <TableCell>{item.quantidade}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addToMovementList(item)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Movimentação */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Movimentações Pendentes ({movementList.length})
                </CardTitle>
                <Button onClick={handleConfirm} disabled={loading || movementList.length === 0}>
                  <Save className="w-4 h-4 mr-2" />
                  Confirmar Movimentação
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-4">
                {movementList.map((item) => (
                  <Card key={item.codigo}>
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{item.codigo} - {item.material}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromList(item.codigo)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Quantidade</label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantidade}
                            onChange={(e) => updateItem(item.codigo, 'quantidade', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Observação</label>
                        <Textarea
                          placeholder="Ex: NF 5542, Uso interno..."
                          value={item.obs}
                          onChange={(e) => updateItem(item.codigo, 'obs', e.target.value)}
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {movementList.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum item adicionado. Busque e adicione produtos à lista.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StockMovement;
