import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventoryData } from '@/hooks/useInventoryData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Save, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface UpdateItem {
  codigo: string;
  material: string;
  quantidadeAtual: number;
  novaQuantidade: string;
}

const MassUpdate = () => {
  const navigate = useNavigate();
  const { data, massUpdate } = useInventoryData();
  const [searchTerm, setSearchTerm] = useState('');
  const [updateList, setUpdateList] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const userName = 'Admin'; // Nome padrão já que não há mais autenticação

  const filteredProducts = data.filter(item =>
    item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.material.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToUpdateList = (item: typeof data[0]) => {
    if (updateList.some(u => u.codigo === item.codigo)) {
      toast.error('Item já adicionado à lista');
      return;
    }

    setUpdateList([...updateList, {
      codigo: item.codigo,
      material: item.material,
      quantidadeAtual: item.quantidade,
      novaQuantidade: item.quantidade.toString()
    }]);
    toast.success('Item adicionado à lista');
  };

  const removeFromList = (codigo: string) => {
    setUpdateList(updateList.filter(item => item.codigo !== codigo));
  };

  const updateQuantity = (codigo: string, value: string) => {
    setUpdateList(updateList.map(item =>
      item.codigo === codigo ? { ...item, novaQuantidade: value } : item
    ));
  };

  const handleSave = async () => {
    if (updateList.length === 0) {
      toast.error('Adicione itens à lista antes de salvar');
      return;
    }

    setLoading(true);
    const produtos = updateList.map(item => ({
      codigo: item.codigo,
      quantidade: item.novaQuantidade
    }));

    const result = await massUpdate(userName, produtos);
    
    if (result.success) {
      setUpdateList([]);
      setSearchTerm('');
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
            <h1 className="text-3xl font-bold">Atualizar Estoque em Massa</h1>
          </div>
          <Button onClick={handleSave} disabled={loading || updateList.length === 0}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
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
                            onClick={() => addToUpdateList(item)}
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

          {/* Lista de Atualização */}
          <Card>
            <CardHeader>
              <CardTitle>Itens para Atualização ({updateList.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Atual</TableHead>
                      <TableHead>Nova Qtd</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {updateList.map((item) => (
                      <TableRow key={item.codigo}>
                        <TableCell className="font-medium">{item.codigo}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.material}</TableCell>
                        <TableCell>{item.quantidadeAtual}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={item.novaQuantidade}
                            onChange={(e) => updateQuantity(item.codigo, e.target.value)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromList(item.codigo)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MassUpdate;
