import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { ClipboardList, Send } from 'lucide-react';

const SolicitarMaterial = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [setores, setSetores] = useState<Array<{ id: string; nome: string }>>([]);
  
  const [formData, setFormData] = useState({
    setor: '',
    codigo: '',
    material: '',
    quantidade: '',
    obs: '',
  });

  useEffect(() => {
    const loadSetores = async () => {
      if (!user?.email) return;
      try {
        const response = await api.listarSetores(user.email);
        if (response.setores) {
          setSetores(response.setores);
        }
      } catch (error) {
        console.error('Erro ao carregar setores:', error);
      }
    };
    loadSetores();
  }, [user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.setor || !formData.codigo || !formData.material || !formData.quantidade) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.email) return;

    setLoading(true);
    try {
      const response = await api.solicitarMaterial(
        user.email,
        formData.setor,
        formData.codigo,
        formData.material,
        formData.quantidade,
        formData.obs
      );

      if (response.ok) {
        toast({
          title: 'Sucesso!',
          description: response.msg || 'Solicitação enviada com sucesso.',
        });
        setFormData({ setor: '', codigo: '', material: '', quantidade: '', obs: '' });
      } else {
        toast({
          title: 'Erro',
          description: response.msg || 'Erro ao enviar solicitação.',
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
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Solicitar Material
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Setor *</Label>
              <Select value={formData.setor} onValueChange={(v) => setFormData(prev => ({ ...prev, setor: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {setores.map((s) => (
                    <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                placeholder="Código do material"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material">Material *</Label>
              <Input
                id="material"
                value={formData.material}
                onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                placeholder="Nome do material"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                value={formData.quantidade}
                onChange={(e) => setFormData(prev => ({ ...prev, quantidade: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs">Observação</Label>
              <Textarea
                id="obs"
                value={formData.obs}
                onChange={(e) => setFormData(prev => ({ ...prev, obs: e.target.value }))}
                placeholder="Observações adicionais (opcional)"
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <Send className="w-4 h-4" />
              {loading ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default SolicitarMaterial;
