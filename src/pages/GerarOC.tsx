import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useInventoryData } from '@/hooks/useInventoryData';
import { useCurvaABCData } from '@/hooks/useCurvaABCData';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Plus, Trash2, Download, Search, Sparkles } from 'lucide-react';

interface OCItem {
  codigo: string;
  material: string;
  unidade: string;
  quantidade: string;
  preco: string;
}

interface Supplier {
  id: string;
  nome: string;
  cnpj: string | null;
  tipo_material: string;
}

const GerarOC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: inventoryData } = useInventoryData();
  const { results: abcResults } = useCurvaABCData();
  const [loading, setLoading] = useState(false);
  const [loadingSetores, setLoadingSetores] = useState(true);
  const [setores, setSetores] = useState<Array<{ id: string; nome: string }>>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState('manual');

  const [formData, setFormData] = useState({
    setor: '',
    fornecedor: '',
    cond_pagto: '',
    obs: '',
  });

  const [currentItem, setCurrentItem] = useState<OCItem>({
    codigo: '', material: '', unidade: '', quantidade: '', preco: '',
  });

  const [itens, setItens] = useState<OCItem[]>([]);

  const filteredInventory = searchTerm.length >= 1
    ? inventoryData.filter(item =>
        String(item.codigo).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.material).toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10)
    : [];

  // === Aba Automática: Itens Críticos + ABC ===
  const abcMap = useMemo(() => {
    const m = new Map<string, { compraSugerida: number; classe: string }>();
    abcResults.forEach((r: any) => m.set(String(r.material).toUpperCase().trim(), {
      compraSugerida: Number(r.compraSugerida) || 0,
      classe: r.classe,
    }));
    return m;
  }, [abcResults]);

  const criticalItemsAuto = useMemo(() => {
    return inventoryData
      .filter(i => i.status === 'Zerado' || i.status === 'Abaixo do Mínimo')
      .map(i => {
        const abc = abcMap.get(i.material.toUpperCase().trim());
        const sugerido = abc?.compraSugerida || Math.max((i.minimo || 0) * 2 - i.quantidade, i.minimo || 1);
        return {
          codigo: String(i.codigo),
          material: String(i.material),
          unidade: String(i.unidade || ''),
          preco: Number(i.preco) || 0,
          quantidade: i.quantidade,
          minimo: i.minimo,
          sugerido: Math.max(1, Math.ceil(sugerido)),
          classe: abc?.classe || i.curva || '-',
          status: i.status,
        };
      });
  }, [inventoryData, abcMap]);

  const [autoSelected, setAutoSelected] = useState<Record<string, { selected: boolean; qtd: number; preco: number }>>({});

  useEffect(() => {
    // Initialize selection state when criticals change
    setAutoSelected(prev => {
      const next: typeof prev = {};
      criticalItemsAuto.forEach(it => {
        next[it.codigo] = prev[it.codigo] || { selected: true, qtd: it.sugerido, preco: it.preco };
      });
      return next;
    });
  }, [criticalItemsAuto.length]);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('company_id')
          .eq('user_id', authUser.id)
          .not('company_id', 'is', null)
          .limit(1).single();
        if (!roleData?.company_id) return;

        const [setoresRes, supplierRes] = await Promise.all([
          supabase.from('sectors').select('id, nome').eq('company_id', roleData.company_id).order('nome'),
          supabase.from('suppliers').select('id, nome, cnpj, tipo_material').eq('company_id', roleData.company_id).order('nome'),
        ]);
        if (setoresRes.data) setSetores(setoresRes.data);
        if (supplierRes.data) setSuppliers(supplierRes.data as Supplier[]);
      } catch {
        toast({ title: 'Erro', description: 'Erro ao carregar dados.', variant: 'destructive' });
      } finally {
        setLoadingSetores(false);
      }
    };
    loadAll();
  }, []);

  // Pre-fill from Reposição navigation
  useEffect(() => {
    const state = location.state as any;
    if (state?.prefilledItems && Array.isArray(state.prefilledItems)) {
      setItens(state.prefilledItems);
      setTab('manual');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const addItem = () => {
    if (!currentItem.codigo || !currentItem.material || !currentItem.quantidade || !currentItem.preco) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha código, material, quantidade e preço.', variant: 'destructive' });
      return;
    }
    setItens(prev => [...prev, currentItem]);
    setCurrentItem({ codigo: '', material: '', unidade: '', quantidade: '', preco: '' });
  };

  const removeItem = (index: number) => setItens(prev => prev.filter((_, i) => i !== index));

  const importFromAuto = () => {
    const selected = criticalItemsAuto.filter(it => autoSelected[it.codigo]?.selected);
    if (selected.length === 0) {
      toast({ title: 'Nenhum item selecionado', description: 'Selecione ao menos um item.', variant: 'destructive' });
      return;
    }
    const newItens: OCItem[] = selected.map(it => ({
      codigo: it.codigo,
      material: it.material,
      unidade: it.unidade,
      quantidade: String(autoSelected[it.codigo].qtd),
      preco: String(autoSelected[it.codigo].preco),
    }));
    setItens(prev => [...prev, ...newItens]);
    setTab('manual');
    toast({ title: 'Itens importados', description: `${newItens.length} item(ns) adicionados à OC.` });
  };

  const handleSubmit = async () => {
    if (!formData.setor || !formData.fornecedor || !formData.cond_pagto) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha setor, fornecedor e condição de pagamento.', variant: 'destructive' });
      return;
    }
    if (itens.length === 0) {
      toast({ title: 'Adicione itens', description: 'Adicione pelo menos um item.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { toast({ title: 'Erro', description: 'Sessão expirada.', variant: 'destructive' }); return; }
      const selectedSetor = setores.find(s => s.id === formData.setor);
      const selectedSupplier = suppliers.find(s => s.id === formData.fornecedor);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-oc-pdf`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            setor: selectedSetor?.nome || formData.setor,
            fornecedor: selectedSupplier?.nome || formData.fornecedor,
            cond_pagto: formData.cond_pagto,
            obs: formData.obs,
            itens: itens.map(it => ({
              codigo: it.codigo, material: it.material, unidade: it.unidade,
              quantidade: Number(it.quantidade), preco: Number(it.preco),
            })),
          }),
        }
      );
      const result = await response.json();
      if (result.ok) {
        toast({ title: 'Sucesso!', description: result.msg || 'Ordem de compra gerada.' });
        if (result.pdf_url) window.open(result.pdf_url, '_blank');
        setFormData({ setor: '', fornecedor: '', cond_pagto: '', obs: '' });
        setItens([]);
      } else {
        toast({ title: 'Erro', description: result.error || result.msg || 'Erro ao gerar OC.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro ao conectar com o servidor.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const classeBadge = (c: string) => {
    if (c === 'A') return 'bg-red-100 text-red-800 border-red-300';
    if (c === 'B') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (c === 'C') return 'bg-green-100 text-green-800 border-green-300';
    return '';
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Gerar Ordem de Compra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="auto" className="gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Automática (Críticos + ABC)
                </TabsTrigger>
              </TabsList>

              {/* === AUTOMÁTICA === */}
              <TabsContent value="auto" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Itens com estoque zerado ou abaixo do mínimo. Ajuste as quantidades e importe para a OC.
                  Quantidades sugeridas vêm da Curva ABC quando disponíveis.
                </p>
                {criticalItemsAuto.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border rounded-lg">
                    Nenhum item crítico no momento.
                  </div>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <input
                                type="checkbox"
                                checked={criticalItemsAuto.every(it => autoSelected[it.codigo]?.selected)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setAutoSelected(prev => {
                                    const next = { ...prev };
                                    criticalItemsAuto.forEach(it => {
                                      next[it.codigo] = { ...next[it.codigo], selected: checked };
                                    });
                                    return next;
                                  });
                                }}
                              />
                            </TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Material</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Curva</TableHead>
                            <TableHead className="text-right">Estoque</TableHead>
                            <TableHead className="text-right">Mín</TableHead>
                            <TableHead className="text-right">Qtd Sugerida</TableHead>
                            <TableHead className="text-right">Preço</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {criticalItemsAuto.map(it => {
                            const sel = autoSelected[it.codigo] || { selected: true, qtd: it.sugerido, preco: it.preco };
                            return (
                              <TableRow key={it.codigo}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={sel.selected}
                                    onChange={(e) => setAutoSelected(prev => ({ ...prev, [it.codigo]: { ...sel, selected: e.target.checked } }))}
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-xs">{it.codigo}</TableCell>
                                <TableCell>{it.material}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={it.status === 'Zerado' ? 'destructive' : 'outline'}
                                    className={`whitespace-nowrap ${it.status === 'Abaixo do Mínimo' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}`}
                                  >
                                    {it.status}
                                  </Badge>
                                </TableCell>
                                <TableCell><Badge className={classeBadge(it.classe)} variant="outline">{it.classe}</Badge></TableCell>
                                <TableCell className="text-right">{it.quantidade}</TableCell>
                                <TableCell className="text-right">{it.minimo}</TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    value={sel.qtd}
                                    onChange={(e) => setAutoSelected(prev => ({ ...prev, [it.codigo]: { ...sel, qtd: Number(e.target.value) || 0 } }))}
                                    className="w-20 ml-auto h-8"
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number" step="0.01"
                                    value={sel.preco}
                                    onChange={(e) => setAutoSelected(prev => ({ ...prev, [it.codigo]: { ...sel, preco: Number(e.target.value) || 0 } }))}
                                    className="w-24 ml-auto h-8"
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <Button onClick={importFromAuto} className="gap-2">
                      <Plus className="w-4 h-4" /> Adicionar Selecionados à OC
                    </Button>
                  </>
                )}
              </TabsContent>

              {/* === MANUAL === */}
              <TabsContent value="manual" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          setores.map((s) => (<SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fornecedor *</Label>
                    <Select value={formData.fornecedor} onValueChange={(v) => setFormData(prev => ({ ...prev, fornecedor: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={suppliers.length === 0 ? 'Nenhum fornecedor cadastrado' : 'Selecione o fornecedor'} />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.length === 0 ? (
                          <SelectItem value="_empty" disabled>Cadastre fornecedores em Logística › Fornecedores</SelectItem>
                        ) : (
                          suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.nome}{s.tipo_material ? ` — ${s.tipo_material}` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
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
                  <div className="mb-4 space-y-2">
                    <Label>Buscar Material Cadastrado</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por código ou nome..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {filteredInventory.length > 0 && (
                      <div className="border rounded-lg max-h-40 overflow-y-auto">
                        {filteredInventory.map((item) => (
                          <div
                            key={String(item.codigo)}
                            onClick={() => {
                              setCurrentItem({
                                codigo: String(item.codigo),
                                material: String(item.material),
                                unidade: String(item.unidade || ''),
                                quantidade: '',
                                preco: String(item.preco || ''),
                              });
                              setSearchTerm('');
                            }}
                            className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0 flex justify-between"
                          >
                            <span><span className="font-mono">{item.codigo}</span> - {item.material}</span>
                            <span className="text-sm text-muted-foreground">{item.unidade}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                    <Input placeholder="Código" value={currentItem.codigo} onChange={(e) => setCurrentItem(prev => ({ ...prev, codigo: e.target.value }))} />
                    <Input placeholder="Material" value={currentItem.material} onChange={(e) => setCurrentItem(prev => ({ ...prev, material: e.target.value }))} />
                    <Input placeholder="Unidade" value={currentItem.unidade} onChange={(e) => setCurrentItem(prev => ({ ...prev, unidade: e.target.value }))} />
                    <Input type="number" placeholder="Qtd" value={currentItem.quantidade} onChange={(e) => setCurrentItem(prev => ({ ...prev, quantidade: e.target.value }))} />
                    <Input type="number" step="0.01" placeholder="Preço" value={currentItem.preco} onChange={(e) => setCurrentItem(prev => ({ ...prev, preco: e.target.value }))} />
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
                            <TableCell>R$ {parseFloat(item.preco || '0').toFixed(2)}</TableCell>
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
                  <Download className="w-4 h-4" />
                  {loading ? 'Gerando...' : 'Gerar e Baixar Ordem de Compra'}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default GerarOC;
