import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Package, Save } from 'lucide-react';

const AtualizarEstoque = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [quantidade, setQuantidade] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codigo.trim() || !quantidade.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o código e a quantidade.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.email) return;

    setLoading(true);
    try {
      const response = await api.updateStock(user.email, codigo.trim(), quantidade.trim());

      if (response.ok) {
        toast({
          title: 'Sucesso!',
          description: response.msg || 'Estoque atualizado com sucesso.',
        });
        setCodigo('');
        setQuantidade('');
      } else {
        toast({
          title: 'Erro',
          description: response.msg || 'Erro ao atualizar estoque.',
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
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Atualizar Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código do Produto *</Label>
              <Input
                id="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ex: 001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantidade">Nova Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="0"
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <Save className="w-4 h-4" />
              {loading ? 'Atualizando...' : 'Atualizar Estoque'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default AtualizarEstoque;
