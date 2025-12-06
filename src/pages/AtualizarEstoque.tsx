import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useInventoryData } from '@/hooks/useInventoryData';
import { api } from '@/services/api';
import { Package, Save, Search, RefreshCw } from 'lucide-react';

const AtualizarEstoque = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: inventoryData, loading: inventoryLoading, refetch } = useInventoryData();
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});

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
      toast({
        title: 'Campo obrigatório',
        description: 'Informe a quantidade.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.email) return;

    setSaving(codigo);
    try {
      const response = await api.updateStock(user.email, codigo, quantidade);

      if (response.ok) {
        toast({
          title: 'Sucesso!',
          description: response.msg || 'Estoque atualizado.',
        });
        refetch();
      } else {
        toast({
          title: 'Erro',
          description: response.msg || 'Erro ao atualizar.',
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
      setSaving(null);
    }
  };

  const filteredItems = inventoryData.filter(item => 
    String(item.codigo).toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(item.material).toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                    <TableHead>Qtd Atual</TableHead>
                    <TableHead className="w-[120px]">Nova Qtd</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.codigo}>
                      <TableCell className="font-mono">{item.codigo}</TableCell>
                      <TableCell className="font-medium">{item.material}</TableCell>
                      <TableCell>{item.unidade}</TableCell>
                      <TableCell>{item.quantidade}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={quantities[item.codigo] || ''}
                          onChange={(e) => handleQuantityChange(item.codigo, e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          onClick={() => handleSave(item.codigo)}
                          disabled={saving === item.codigo}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default AtualizarEstoque;
