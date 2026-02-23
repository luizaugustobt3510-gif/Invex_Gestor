import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Package, Save } from 'lucide-react';

interface MaterialForm {
  codigo: string;
  material: string;
  unidade: string;
  localizacao: string;
  validade: string;
  quantidade: string;
  minimo: string;
  maximo: string;
  preco: string;
}

const CadastrarMaterial = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<MaterialForm>({
    codigo: '', material: '', unidade: '', localizacao: '', validade: '',
    quantidade: '', minimo: '', maximo: '', preco: '',
  });

  const handleChange = (field: keyof MaterialForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.codigo || !formData.material || !formData.unidade) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha código, material e unidade.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .not('company_id', 'is', null)
        .limit(1)
        .single();

      if (!roleData?.company_id) throw new Error('Empresa não encontrada');

      const { error } = await supabase.from('materials').insert({
        company_id: roleData.company_id,
        codigo: formData.codigo,
        material: formData.material,
        unidade: formData.unidade,
        localizacao: formData.localizacao || '',
        validade: formData.validade || null,
        quantidade: Number(formData.quantidade) || 0,
        minimo: Number(formData.minimo) || 0,
        maximo: Number(formData.maximo) || 0,
        preco: Number(formData.preco) || 0,
      });

      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Material cadastrado com sucesso.' });
      setFormData({ codigo: '', material: '', unidade: '', localizacao: '', validade: '', quantidade: '', minimo: '', maximo: '', preco: '' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Erro ao cadastrar material.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Cadastrar Material
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input id="codigo" value={formData.codigo} onChange={(e) => handleChange('codigo', e.target.value)} placeholder="Ex: 001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="material">Material *</Label>
                <Input id="material" value={formData.material} onChange={(e) => handleChange('material', e.target.value)} placeholder="Nome do material" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade *</Label>
                <Input id="unidade" value={formData.unidade} onChange={(e) => handleChange('unidade', e.target.value)} placeholder="Ex: UNIDADE, CX, PCT" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="localizacao">Localização</Label>
                <Input id="localizacao" value={formData.localizacao} onChange={(e) => handleChange('localizacao', e.target.value)} placeholder="Ex: Prateleira A1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validade">Validade</Label>
                <Input id="validade" type="date" value={formData.validade} onChange={(e) => handleChange('validade', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade</Label>
                <Input id="quantidade" type="number" value={formData.quantidade} onChange={(e) => handleChange('quantidade', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimo">Mínimo</Label>
                <Input id="minimo" type="number" value={formData.minimo} onChange={(e) => handleChange('minimo', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maximo">Máximo</Label>
                <Input id="maximo" type="number" value={formData.maximo} onChange={(e) => handleChange('maximo', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="preco">Preço</Label>
                <Input id="preco" type="number" step="0.01" value={formData.preco} onChange={(e) => handleChange('preco', e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Salvar Material'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default CadastrarMaterial;
