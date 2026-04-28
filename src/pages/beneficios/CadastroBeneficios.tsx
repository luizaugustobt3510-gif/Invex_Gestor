import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, Plus, Pencil, Trash2, Sparkles } from 'lucide-react';
import { beneficiosService, Benefit, BENEFIT_TYPE_LABELS, COST_TYPE_LABELS, BenefitType, CostType } from '@/services/beneficiosService';

const empty = {
  name: '', type: 'outros' as BenefitType, cost_type: 'empresa' as CostType,
  base_value: '', is_variable: false, allows_dependents: false, status: 'ativo',
  start_date: new Date().toISOString().slice(0, 10), description: '',
};

export default function CadastroBeneficios() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    const { data } = await beneficiosService.listBenefits(user.companyId);
    setItems((data as Benefit[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.companyId]);

  const openNew = () => { setEditingId(null); setForm(empty); setDialogOpen(true); };
  const openEdit = (b: Benefit) => {
    setEditingId(b.id);
    setForm({
      name: b.name, type: b.type, cost_type: b.cost_type,
      base_value: String(b.base_value), is_variable: b.is_variable,
      allows_dependents: b.allows_dependents, status: b.status,
      start_date: b.start_date, description: b.description || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user?.companyId) return;
    if (!form.name.trim()) { toast({ title: 'Nome obrigatório', variant: 'destructive' }); return; }
    const payload = {
      company_id: user.companyId,
      name: form.name.trim(),
      type: form.type,
      cost_type: form.cost_type,
      base_value: Number(form.base_value || 0),
      is_variable: form.is_variable,
      allows_dependents: form.allows_dependents,
      status: form.status as 'ativo' | 'inativo',
      start_date: form.start_date,
      description: form.description,
    };
    const res = editingId
      ? await beneficiosService.updateBenefit(editingId, payload)
      : await beneficiosService.createBenefit(payload);
    if (res.error) {
      toast({ title: 'Erro ao salvar', description: res.error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editingId ? 'Benefício atualizado' : 'Benefício cadastrado' });
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir benefício? Esta ação é permanente.')) return;
    const { error } = await beneficiosService.deleteBenefit(id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Benefício excluído' });
    load();
  };

  const handleSeed = async () => {
    if (!user?.companyId) return;
    if (!confirm('Cadastrar benefícios padrão (VR, VA, Plano de Saúde, Odonto, Gympass, Vale-Transporte)?\nSerão criados como inativos.')) return;
    const { error } = await beneficiosService.seedDefaults(user.companyId);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Benefícios padrão cadastrados' });
    load();
  };

  return (
    <MainLayout title="Catálogo de Benefícios" subtitle="Cadastre benefícios oferecidos pela empresa">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-muted-foreground"><Heart className="w-5 h-5 text-primary" /><span className="text-sm">{items.length} benefício(s) cadastrado(s)</span></div>
        <div className="flex gap-2">
          {items.length === 0 && (
            <Button variant="outline" onClick={handleSeed}><Sparkles className="w-4 h-4 mr-2" />Cadastrar exemplos</Button>
          )}
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novo Benefício</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Valor Base</TableHead>
                <TableHead>Dependentes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum benefício cadastrado.</TableCell></TableRow>
              ) : items.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{BENEFIT_TYPE_LABELS[b.type]}</TableCell>
                  <TableCell>{COST_TYPE_LABELS[b.cost_type]}</TableCell>
                  <TableCell>R$ {Number(b.base_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>{b.allows_dependents ? 'Sim' : 'Não'}</TableCell>
                  <TableCell><Badge variant={b.status === 'ativo' ? 'default' : 'secondary'}>{b.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? 'Editar' : 'Novo'} Benefício</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome do Benefício *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Plano de Saúde" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v: BenefitType) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BENEFIT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Tipo de Custo</Label>
                <Select value={form.cost_type} onValueChange={(v: CostType) => setForm({ ...form, cost_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(COST_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor Base (R$)</Label><Input type="number" step="0.01" value={form.base_value} onChange={e => setForm({ ...form, base_value: e.target.value })} /></div>
              <div><Label>Data de Início</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div><Label className="text-sm">Valor variável por funcionário</Label><p className="text-xs text-muted-foreground">Permite editar o valor no vínculo</p></div>
              <Switch checked={form.is_variable} onCheckedChange={c => setForm({ ...form, is_variable: c })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div><Label className="text-sm">Permitir dependentes</Label></div>
              <Switch checked={form.allows_dependents} onCheckedChange={c => setForm({ ...form, allows_dependents: c })} />
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
