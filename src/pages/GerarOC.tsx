import { useState, useEffect } from 'react';
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
import { api, OCItem } from '@/services/api';
import { FileText, Plus, Trash2, ExternalLink } from 'lucide-react';

const GerarOC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [setores, setSetores] = useState<Array<{ id: string; nome: string }>>([]);
  const [pdfLink, setPdfLink] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    setor: '',
    fornecedor: '',
    cond_pagto: '',
    obs: '',
  });

  const [currentItem, setCurrentItem] = useState<OCItem>({
    codigo: '',
    material: '',
    unidade: '',
    quantidade: '',
    preco: '',
  });

  const [itens, setItens] = useState<OCItem[]>([]);

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

  const addItem = () => {
    if (!currentItem.codigo || !currentItem.material || !currentItem.quantidade || !currentItem.preco) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha código, material, quantidade e preço do item.',
        variant: 'destructive',
      });
      return;
    }

    setItens(prev => [...prev, currentItem]);
    setCurrentItem({ codigo: '', material: '', unidade: '', quantidade: '', preco: '' });
  };

  const removeItem = (index: number) => {
    setItens(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.setor || !formData.fornecedor || !formData.cond_pagto) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha setor, fornecedor e condição de pagamento.',
        variant: 'destructive',
      });
      return;
    }

    if (itens.length === 0) {
      toast({
        title: 'Adicione itens',
        description: 'Adicione pelo menos um item à ordem de compra.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.email) return;

    setLoading(true);
    try {
      const response = await api.gerarOC(
        user.email,
        formData.setor,
        formData.fornecedor,
        formData.cond_pagto,
        formData.obs,
        itens
      );

      if (response.ok) {
        toast({
          title: 'Sucesso!',
          description: response.msg || 'Ordem de compra gerada com sucesso.',
        });
        if (response.link) {
          setPdfLink(response.link);
        }
        setFormData({ setor: '', fornecedor: '', cond_pagto: '', obs: '' });
        setItens([]);
      } else {
        toast({
          title: 'Erro',
          description: response.msg || 'Erro ao gerar ordem de compra.',
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
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Gerar Ordem de Compra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label>Fornecedor *</Label>
                <Input
                  value={formData.fornecedor}
                  onChange={(e) => setFormData(prev => ({ ...prev, fornecedor: e.target.value }))}
                  placeholder="Nome do fornecedor"
                />
              </div>
              <div className="space-y-2">
                <Label>Condição de Pagamento *</Label>
                <Input
                  value={formData.cond_pagto}
                  onChange={(e) => setFormData(prev => ({ ...prev, cond_pagto: e.target.value }))}
                  placeholder="Ex: 30/60/90 dias"
                />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.obs}
                  onChange={(e) => setFormData(prev => ({ ...prev, obs: e.target.value }))}
                  placeholder="Observações adicionais"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Adicionar Item</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                <Input
                  placeholder="Código"
                  value={currentItem.codigo}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, codigo: e.target.value }))}
                />
                <Input
                  placeholder="Material"
                  value={currentItem.material}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, material: e.target.value }))}
                />
                <Input
                  placeholder="Unidade"
                  value={currentItem.unidade}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, unidade: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Qtd"
                  value={currentItem.quantidade}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, quantidade: e.target.value }))}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Preço"
                  value={currentItem.preco}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, preco: e.target.value }))}
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
                      <TableHead>Material</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.codigo}</TableCell>
                        <TableCell>{item.material}</TableCell>
                        <TableCell>{item.unidade}</TableCell>
                        <TableCell>{item.quantidade}</TableCell>
                        <TableCell>R$ {parseFloat(item.preco).toFixed(2)}</TableCell>
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
              <FileText className="w-4 h-4" />
              {loading ? 'Gerando...' : 'Gerar Ordem de Compra'}
            </Button>

            {pdfLink && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="font-semibold mb-2">PDF Gerado!</p>
                <a href={pdfLink} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" /> Abrir PDF
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default GerarOC;
