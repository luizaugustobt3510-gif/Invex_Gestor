import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Star, Trophy, Edit2 } from 'lucide-react';

interface Supplier {
  id: string;
  company_id: string;
  nome: string;
  cnpj: string | null;
  tipo_material: string;
  preco_medio: number;
  prazo_medio_dias: number;
  nota_qualidade: number;
  observacoes: string | null;
  created_at: string;
}

interface Evaluation {
  id: string;
  supplier_id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
}

function getScoreLabel(score: number) {
  if (score >= 0.85) return { label: 'Ótimo', color: 'bg-green-100 text-green-800 border-green-300' };
  if (score >= 0.70) return { label: 'Bom', color: 'bg-blue-100 text-blue-800 border-blue-300' };
  if (score >= 0.50) return { label: 'Regular', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
  return { label: 'Ruim', color: 'bg-red-100 text-red-800 border-red-300' };
}

export default function Fornecedores() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [evalDialogOpen, setEvalDialogOpen] = useState(false);
  const [evalSupplier, setEvalSupplier] = useState<Supplier | null>(null);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation[]>>({});

  // Form state
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [tipoMaterial, setTipoMaterial] = useState('');
  const [precoMedio, setPrecoMedio] = useState('');
  const [prazoMedio, setPrazoMedio] = useState('');
  const [notaQualidade, setNotaQualidade] = useState(5);
  const [observacoes, setObservacoes] = useState('');

  // Eval form
  const [evalNota, setEvalNota] = useState(5);
  const [evalComentario, setEvalComentario] = useState('');

  // Analysis weights
  const [pesoPreco, setPesoPreco] = useState(0.4);
  const [pesoPrazo, setPesoPrazo] = useState(0.3);
  const [pesoQualidade, setPesoQualidade] = useState(0.3);
  const [filtroTipo, setFiltroTipo] = useState('all');

  const companyId = user?.companyId;

  const fetchSuppliers = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('company_id', companyId)
      .order('nome');
    if (!error && data) setSuppliers(data as Supplier[]);
    setLoading(false);
  };

  const fetchEvaluations = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from('supplier_evaluations')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (data) {
      const grouped: Record<string, Evaluation[]> = {};
      (data as Evaluation[]).forEach(e => {
        if (!grouped[e.supplier_id]) grouped[e.supplier_id] = [];
        grouped[e.supplier_id].push(e);
      });
      setEvaluations(grouped);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchEvaluations();
  }, [companyId]);

  const resetForm = () => {
    setNome(''); setCnpj(''); setTipoMaterial(''); setPrecoMedio('');
    setPrazoMedio(''); setNotaQualidade(5); setObservacoes('');
    setEditingSupplier(null);
  };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setNome(s.nome);
    setCnpj(s.cnpj || '');
    setTipoMaterial(s.tipo_material);
    setPrecoMedio(String(s.preco_medio));
    setPrazoMedio(String(s.prazo_medio_dias));
    setNotaQualidade(s.nota_qualidade);
    setObservacoes(s.observacoes || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!companyId || !nome.trim() || !tipoMaterial.trim()) {
      toast.error('Preencha nome e tipo de material');
      return;
    }
    const payload = {
      company_id: companyId,
      nome: nome.trim(),
      cnpj: cnpj.trim() || null,
      tipo_material: tipoMaterial.trim(),
      preco_medio: Number(precoMedio) || 0,
      prazo_medio_dias: Number(prazoMedio) || 0,
      nota_qualidade: notaQualidade,
      observacoes: observacoes.trim() || null,
    };

    if (editingSupplier) {
      const { error } = await supabase.from('suppliers').update(payload).eq('id', editingSupplier.id);
      if (error) { toast.error('Erro ao atualizar'); return; }
      toast.success('Fornecedor atualizado');
    } else {
      const { error } = await supabase.from('suppliers').insert(payload);
      if (error) { toast.error('Erro ao cadastrar'); return; }
      toast.success('Fornecedor cadastrado');
    }
    setDialogOpen(false);
    resetForm();
    fetchSuppliers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este fornecedor?')) return;
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Fornecedor excluído');
    fetchSuppliers();
  };

  const handleAddEval = async () => {
    if (!evalSupplier || !companyId) return;
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from('supplier_evaluations').insert({
      company_id: companyId,
      supplier_id: evalSupplier.id,
      nota: evalNota,
      comentario: evalComentario.trim() || null,
      avaliador_id: authData.user?.id || '',
    });
    if (error) { toast.error('Erro ao avaliar'); return; }
    toast.success('Avaliação registrada');
    setEvalDialogOpen(false);
    setEvalNota(5);
    setEvalComentario('');
    fetchEvaluations();
  };

  // Get unique material types
  const tiposMaterial = useMemo(() => {
    const set = new Set(suppliers.map(s => s.tipo_material).filter(Boolean));
    return Array.from(set).sort();
  }, [suppliers]);

  // Filtered suppliers for analysis
  const filteredSuppliers = useMemo(() => {
    if (filtroTipo === 'all') return suppliers;
    return suppliers.filter(s => s.tipo_material === filtroTipo);
  }, [suppliers, filtroTipo]);

  // Calculate scores
  const rankedSuppliers = useMemo(() => {
    if (filteredSuppliers.length === 0) return [];

    const minPreco = Math.min(...filteredSuppliers.map(s => s.preco_medio || 0.01));
    const minPrazo = Math.min(...filteredSuppliers.map(s => s.prazo_medio_dias || 1));
    const maxQualidade = Math.max(...filteredSuppliers.map(s => s.nota_qualidade || 0.01));

    return filteredSuppliers.map(s => {
      const notaPreco = s.preco_medio > 0 ? minPreco / s.preco_medio : 0;
      const notaPrazo = s.prazo_medio_dias > 0 ? minPrazo / s.prazo_medio_dias : 0;
      const notaQual = maxQualidade > 0 ? s.nota_qualidade / maxQualidade : 0;
      const score = pesoPreco * notaPreco + pesoPrazo * notaPrazo + pesoQualidade * notaQual;
      return { ...s, score, notaPreco, notaPrazo, notaQual };
    }).sort((a, b) => b.score - a.score);
  }, [filteredSuppliers, pesoPreco, pesoPrazo, pesoQualidade]);

  // Normalize weights when one changes
  const updateWeight = (which: 'preco' | 'prazo' | 'qualidade', val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    if (which === 'preco') { setPesoPreco(clamped); }
    else if (which === 'prazo') { setPesoPrazo(clamped); }
    else { setPesoQualidade(clamped); }
  };

  return (
    <MainLayout title="Gestão de Fornecedores">
      <Tabs defaultValue="cadastro" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="cadastro">Cadastro de Fornecedores</TabsTrigger>
          <TabsTrigger value="analise">Análise de Fornecedores</TabsTrigger>
        </TabsList>

        {/* ─── CADASTRO ─── */}
        <TabsContent value="cadastro" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Fornecedores Cadastrados</h2>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Fornecedor</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-1.5">
                    <Label>Nome *</Label>
                    <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do fornecedor" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>CNPJ (opcional)</Label>
                    <Input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Tipo de Material *</Label>
                    <Input value={tipoMaterial} onChange={e => setTipoMaterial(e.target.value)} placeholder="Ex: Eletrônicos, Papelaria..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label>Preço Médio (R$)</Label>
                      <Input type="number" min="0" step="0.01" value={precoMedio} onChange={e => setPrecoMedio(e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Prazo Médio (dias)</Label>
                      <Input type="number" min="0" value={prazoMedio} onChange={e => setPrazoMedio(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Nota de Qualidade: {notaQualidade}</Label>
                    <Slider min={0} max={10} step={0.5} value={[notaQualidade]} onValueChange={v => setNotaQualidade(v[0])} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Observações</Label>
                    <Input value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações..." />
                  </div>
                  <Button onClick={handleSave}>{editingSupplier ? 'Salvar' : 'Cadastrar'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Tipo Material</TableHead>
                      <TableHead className="text-right">Preço Médio</TableHead>
                      <TableHead className="text-right">Prazo (dias)</TableHead>
                      <TableHead className="text-right">Qualidade</TableHead>
                      <TableHead className="text-center">Avaliações</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                    ) : suppliers.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum fornecedor cadastrado</TableCell></TableRow>
                    ) : suppliers.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{s.cnpj || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{s.tipo_material}</Badge></TableCell>
                        <TableCell className="text-right">R$ {Number(s.preco_medio).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{s.prazo_medio_dias}</TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                            {Number(s.nota_qualidade).toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" onClick={() => { setEvalSupplier(s); setEvalDialogOpen(true); }}>
                            {evaluations[s.id]?.length || 0} <Star className="w-3 h-3 ml-1" />
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Dialog */}
          <Dialog open={evalDialogOpen} onOpenChange={setEvalDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Avaliações — {evalSupplier?.nome}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Nova Avaliação (0-10): {evalNota}</Label>
                  <Slider min={0} max={10} step={0.5} value={[evalNota]} onValueChange={v => setEvalNota(v[0])} />
                  <Input value={evalComentario} onChange={e => setEvalComentario(e.target.value)} placeholder="Comentário (opcional)" />
                  <Button size="sm" onClick={handleAddEval}>Registrar Avaliação</Button>
                </div>
                {evalSupplier && evaluations[evalSupplier.id]?.length > 0 && (
                  <div className="border-t pt-3 space-y-2 max-h-48 overflow-y-auto">
                    <p className="text-xs font-semibold text-muted-foreground">Histórico</p>
                    {evaluations[evalSupplier.id].map(ev => (
                      <div key={ev.id} className="flex justify-between items-center text-sm border-b pb-1">
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> {Number(ev.nota).toFixed(1)}</span>
                        <span className="text-muted-foreground text-xs">{ev.comentario || '—'}</span>
                        <span className="text-muted-foreground text-xs">{new Date(ev.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ─── ANÁLISE ─── */}
        <TabsContent value="analise" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Filters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Filtrar por Tipo de Material</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {tiposMaterial.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Weights */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pesos da Análise</CardTitle>
                <CardDescription className="text-xs">
                  Soma: {(pesoPreco + pesoPrazo + pesoQualidade).toFixed(2)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Preço: {(pesoPreco * 100).toFixed(0)}%</Label>
                  <Slider min={0} max={1} step={0.05} value={[pesoPreco]} onValueChange={v => updateWeight('preco', v[0])} />
                </div>
                <div>
                  <Label className="text-xs">Prazo: {(pesoPrazo * 100).toFixed(0)}%</Label>
                  <Slider min={0} max={1} step={0.05} value={[pesoPrazo]} onValueChange={v => updateWeight('prazo', v[0])} />
                </div>
                <div>
                  <Label className="text-xs">Qualidade: {(pesoQualidade * 100).toFixed(0)}%</Label>
                  <Slider min={0} max={1} step={0.05} value={[pesoQualidade]} onValueChange={v => updateWeight('qualidade', v[0])} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ranking Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" /> Ranking de Fornecedores
              </CardTitle>
              <CardDescription>{rankedSuppliers.length} fornecedor(es) encontrado(s)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Prazo</TableHead>
                      <TableHead className="text-right">Qualidade</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-center">Classificação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankedSuppliers.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum fornecedor para analisar</TableCell></TableRow>
                    ) : rankedSuppliers.map((s, idx) => {
                      const scoreInfo = getScoreLabel(s.score);
                      const isBest = idx === 0;
                      return (
                        <TableRow key={s.id} className={isBest ? 'bg-primary/5 border-l-4 border-l-primary' : ''}>
                          <TableCell className="text-center font-bold">
                            {isBest ? <Trophy className="w-5 h-5 text-yellow-500 mx-auto" /> : idx + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            {s.nome}
                            {isBest && <Badge className="ml-2 bg-primary/10 text-primary text-xs">Melhor</Badge>}
                          </TableCell>
                          <TableCell><Badge variant="outline">{s.tipo_material}</Badge></TableCell>
                          <TableCell className="text-right text-sm">
                            R$ {Number(s.preco_medio).toFixed(2)}
                            <span className="block text-xs text-muted-foreground">{(s.notaPreco * 100).toFixed(0)}%</span>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {s.prazo_medio_dias}d
                            <span className="block text-xs text-muted-foreground">{(s.notaPrazo * 100).toFixed(0)}%</span>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {Number(s.nota_qualidade).toFixed(1)}
                            <span className="block text-xs text-muted-foreground">{(s.notaQual * 100).toFixed(0)}%</span>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{(s.score * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${scoreInfo.color} border`}>{scoreInfo.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
