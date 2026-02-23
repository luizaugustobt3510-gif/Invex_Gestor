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
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList, Send } from 'lucide-react';

const SolicitarMaterial = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingSetores, setLoadingSetores] = useState(true);
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
      setLoadingSetores(true);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('company_id')
          .eq('user_id', authUser.id)
          .not('company_id', 'is', null)
          .limit(1)
          .single();

        if (!roleData?.company_id) return;

        const { data, error } = await supabase
          .from('sectors')
          .select('id, nome')
          .eq('company_id', roleData.company_id)
          .order('nome');

        if (error) throw error;
        setSetores(data || []);
      } catch (error) {
        console.error('Erro ao carregar setores:', error);
      } finally {
        setLoadingSetores(false);
      }
    };
    loadSetores();
  }, []);

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

    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Não autenticado');

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', authUser.id)
        .not('company_id', 'is', null)
        .limit(1)
        .single();

      if (!roleData?.company_id) throw new Error('Empresa não encontrada');

      const selectedSetor = setores.find(s => s.id === formData.setor);

      const { error } = await supabase.from('material_requests').insert({
        company_id: roleData.company_id,
        user_id: authUser.id,
        setor: selectedSetor?.nome || formData.setor,
        codigo: formData.codigo,
        material: formData.material,
        quantidade: Number(formData.quantidade),
        obs: formData.obs || '',
      });

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Solicitação enviada com sucesso.',
      });
      setFormData({ setor: '', codigo: '', material: '', quantidade: '', obs: '' });
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Erro ao enviar solicitação.',
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
                  <SelectValue placeholder={loadingSetores ? 'Carregando...' : setores.length === 0 ? 'Nenhum setor cadastrado' : 'Selecione o setor'} />
                </SelectTrigger>
                <SelectContent>
                  {setores.length === 0 ? (
                    <SelectItem value="_empty" disabled>Nenhum setor cadastrado</SelectItem>
                  ) : (
                    setores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))
                  )}
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
