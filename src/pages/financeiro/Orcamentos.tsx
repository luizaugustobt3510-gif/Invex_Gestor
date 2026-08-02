import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil, Trash2, Target } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const Orcamentos = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<{ id: string | null; tipo: string; categoria_id: string; centro_custo_id: string; valor_previsto: string }>({ id: null, tipo: 'despesa', categoria_id: '', centro_custo_id: '', valor_previsto: '' });

  const load = async () => {
    if (!user?.companyId) return;
    const [{ data: b }, { data: c }, { data: cc }, { data: e }] = await Promise.all([
      supabase.from('financial_budgets').select('*').eq('company_id', user.companyId).eq('ano', ano).eq('mes', mes),
      supabase.from('financial_categories').select('*').eq('company_id', user.companyId).order('nome'),
      supabase.from('cost_centers').select('*').eq('company_id', user.companyId).order('nome'),
      supabase.from('financial_entries').select('*').eq('company_id', user.companyId).neq('status', 'cancelado'),
    ]);
    setBudgets(b || []);
    setCategories(c || []);
    setCostCenters(cc || []);
    setEntries(e || []);
  };

  useEffect(() => { load(); }, [user?.companyId, ano, mes]);

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c.nome])), [categories]);
  const ccMap = useMemo(() => new Map(costCenters.map(c => [c.id, c.nome])), [costCenters]);

  const realizadoDe = (b: any) => entries.filter(e => {
    const d = parseISO(e.data);
    if (d.getFullYear() !== ano || d.getMonth() + 1 !== mes) return false;
    if (e.tipo !== b.tipo) return false;
    if (b.categoria_id && e.categoria_id !== b.categoria_id) return false;
    if (b.centro_custo_id && e.centro_custo_id !== b.centro_custo_id) return false;
    return true;
  }).reduce((s, e) => s + Number(e.valor), 0);

  const totalPrevisto = budgets.reduce((s, b) => s + Number(b.valor_previsto), 0);
  const totalRealizado = budgets.reduce((s, b) => s + realizadoDe(b), 0);

  const save = async () => {
    if (!form.valor_previsto) return toast({ title: 'Informe o valor previsto', variant: 'destructive' });
    const payload = {
      tipo: form.tipo,
      categoria_id: form.categoria_id || null,
      centro_custo_id: form.centro_custo_id || null,
      valor_previsto: Number(form.valor_previsto),
      ano, mes,
    };
    const { error } = form.id
      ? await supabase.from('financial_budgets').update(payload).eq('id', form.id)
      : await supabase.from('financial_budgets').insert({ ...payload, company_id: user!.companyId! });
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: form.id ? 'Orçamento atualizado!' : 'Orçamento criado!' });
    setOpen(false);
    setForm({ id: null, tipo: 'despesa', categoria_id: '', centro_custo_id: '', valor_previsto: '' });
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('financial_budgets').delete().eq('id', deleteId);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Orçamento excluído' }); setBudgets(prev => prev.filter(b => b.id !== deleteId)); }
    setDeleteId(null);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Orçamentos</h1>
          <div className="flex flex-wrap gap-2">
            <Select value={String(mes)} onValueChange={v => setMes(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{MESES.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button className="gap-2" onClick={() => { setForm({ id: null, tipo: 'despesa', categoria_id: '', centro_custo_id: '', valor_previsto: '' }); setOpen(true); }}>
              <Plus className="w-4 h-4" /> Novo Orçamento
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Previsto</p><p className="text-xl font-bold text-blue-600">{fmt(totalPrevisto)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Realizado</p><p className="text-xl font-bold text-foreground">{fmt(totalRealizado)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Diferença</p><p className={`text-xl font-bold ${totalPrevisto - totalRealizado >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totalPrevisto - totalRealizado)}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4" /> {MESES[mes - 1]} de {ano}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {budgets.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum orçamento definido para este período</p>}
            {budgets.map(b => {
              const realizado = realizadoDe(b);
              const previsto = Number(b.valor_previsto);
              const pct = previsto > 0 ? Math.min((realizado / previsto) * 100, 100) : 0;
              const estourou = realizado > previsto;
              return (
                <div key={b.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{b.categoria_id ? catMap.get(b.categoria_id) : 'Todas as categorias'}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.centro_custo_id ? ccMap.get(b.centro_custo_id) : 'Todos os centros de custo'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={b.tipo === 'receita' ? 'default' : 'secondary'}>{b.tipo === 'receita' ? 'Receita' : 'Despesa'}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => { setForm({ id: b.id, tipo: b.tipo, categoria_id: b.categoria_id || '', centro_custo_id: b.centro_custo_id || '', valor_previsto: String(b.valor_previsto) }); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(b.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <Progress value={pct} className={estourou ? '[&>div]:bg-destructive' : ''} />
                  <div className="flex flex-wrap justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">Realizado: <span className="font-medium text-foreground">{fmt(realizado)}</span></span>
                    <span className="text-muted-foreground">Previsto: <span className="font-medium text-foreground">{fmt(previsto)}</span></span>
                    <span className={estourou ? 'text-destructive font-medium' : 'text-green-600 font-medium'}>
                      {estourou ? `Excedeu ${fmt(realizado - previsto)}` : `Disponível ${fmt(previsto - realizado)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? 'Editar' : 'Novo'} Orçamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v, categoria_id: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="despesa">Despesa</SelectItem><SelectItem value="receita">Receita</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Categoria</Label>
              <Select value={form.categoria_id} onValueChange={v => setForm(p => ({ ...p, categoria_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>{categories.filter(c => c.tipo === form.tipo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Centro de Custo</Label>
              <Select value={form.centro_custo_id} onValueChange={v => setForm(p => ({ ...p, centro_custo_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>{costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Valor previsto (R$) *</Label><Input type="number" inputMode="decimal" value={form.valor_previsto} onChange={e => setForm(p => ({ ...p, valor_previsto: e.target.value }))} /></div>
            <p className="text-xs text-muted-foreground">Período: {MESES[mes - 1]} de {ano}</p>
            <Button className="w-full" onClick={save}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Orcamentos;
