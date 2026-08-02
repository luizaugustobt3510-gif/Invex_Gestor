import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';

const CentrosCusto = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [totals, setTotals] = useState<Record<string, { receita: number; despesa: number }>>({});
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<{ id: string | null; nome: string; descricao: string; ativo: boolean }>({ id: null, nome: '', descricao: '', ativo: true });

  const load = async () => {
    if (!user?.companyId) return;
    const [{ data }, { data: entries }] = await Promise.all([
      supabase.from('cost_centers').select('*').eq('company_id', user.companyId).order('nome'),
      supabase.from('financial_entries').select('centro_custo_id, tipo, valor, status').eq('company_id', user.companyId).eq('status', 'pago'),
    ]);
    setItems(data || []);
    const t: Record<string, { receita: number; despesa: number }> = {};
    (entries || []).forEach((e: any) => {
      if (!e.centro_custo_id) return;
      if (!t[e.centro_custo_id]) t[e.centro_custo_id] = { receita: 0, despesa: 0 };
      t[e.centro_custo_id][e.tipo === 'receita' ? 'receita' : 'despesa'] += Number(e.valor);
    });
    setTotals(t);
  };

  useEffect(() => { load(); }, [user?.companyId]);

  const save = async () => {
    if (!form.nome.trim()) return toast({ title: 'Informe o nome', variant: 'destructive' });
    const payload = { nome: form.nome, descricao: form.descricao || null, ativo: form.ativo };
    const { error } = form.id
      ? await supabase.from('cost_centers').update(payload).eq('id', form.id)
      : await supabase.from('cost_centers').insert({ ...payload, company_id: user!.companyId! });
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: form.id ? 'Centro de custo atualizado!' : 'Centro de custo criado!' });
    setOpen(false);
    setForm({ id: null, nome: '', descricao: '', ativo: true });
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('cost_centers').delete().eq('id', deleteId);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Excluído' }); setItems(prev => prev.filter(i => i.id !== deleteId)); }
    setDeleteId(null);
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Centros de Custo</h1>
          <Button className="gap-2" onClick={() => { setForm({ id: null, nome: '', descricao: '', ativo: true }); setOpen(true); }}>
            <Plus className="w-4 h-4" /> Novo Centro de Custo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.length === 0 && <p className="text-muted-foreground">Nenhum centro de custo cadastrado.</p>}
          {items.map(c => {
            const t = totals[c.id] || { receita: 0, despesa: 0 };
            return (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 shrink-0" /> <span className="truncate">{c.nome}</span>
                    </CardTitle>
                    {!c.ativo && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {c.descricao && <p className="text-xs text-muted-foreground">{c.descricao}</p>}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-xs text-muted-foreground">Receitas</p><p className="font-medium text-green-600">{fmt(t.receita)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Despesas</p><p className="font-medium text-red-600">{fmt(t.despesa)}</p></div>
                  </div>
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => { setForm({ id: c.id, nome: c.nome, descricao: c.descricao || '', ativo: c.ativo }); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? 'Editar' : 'Novo'} Centro de Custo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div className="flex items-center gap-3"><Switch checked={form.ativo} onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))} /><Label>Ativo</Label></div>
            <Button className="w-full" onClick={save}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir centro de custo?</AlertDialogTitle>
            <AlertDialogDescription>Os lançamentos vinculados ficarão sem centro de custo.</AlertDialogDescription>
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

export default CentrosCusto;
