import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface QuickItem {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
}

export default function PrescricaoRapidas() {
  const { user } = useAuth();
  const [items, setItems] = useState<QuickItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QuickItem | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });

  const load = async () => {
    if (!user?.companyId) return;
    const { data, error } = await (supabase.from('prescription_quick_items' as any) as any)
      .select('*').eq('company_id', user.companyId).order('title');
    if (error) toast.error(error.message);
    setItems(((data || []) as any) as QuickItem[]);
  };

  useEffect(() => { load(); }, [user?.companyId]);

  const openNew = () => { setEditing(null); setForm({ title: '', content: '' }); setOpen(true); };
  const openEdit = (m: QuickItem) => { setEditing(m); setForm({ title: m.title, content: m.content }); setOpen(true); };

  const save = async () => {
    if (!user?.companyId) return;
    if (!form.title.trim() || !form.content.trim()) return toast.error('Preencha título e conteúdo');
    const { data: authUser } = await supabase.auth.getUser();
    if (editing) {
      const { error } = await (supabase.from('prescription_quick_items' as any) as any)
        .update({ title: form.title.trim(), content: form.content.trim() })
        .eq('id', editing.id);
      if (error) return toast.error(error.message);
      toast.success('Prescrição rápida atualizada');
    } else {
      const { error } = await (supabase.from('prescription_quick_items' as any) as any).insert({
        company_id: user.companyId,
        title: form.title.trim(),
        content: form.content.trim(),
        is_active: true,
        created_by: authUser.user?.id,
      });
      if (error) return toast.error(error.message);
      toast.success('Prescrição rápida criada');
    }
    setOpen(false);
    load();
  };

  const remove = async (m: QuickItem) => {
    if (!confirm(`Excluir "${m.title}"?`)) return;
    const { error } = await (supabase.from('prescription_quick_items' as any) as any).delete().eq('id', m.id);
    if (error) return toast.error(error.message);
    toast.success('Excluída');
    load();
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/clinica/receituario"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Link>
          </Button>
          <h1 className="text-2xl font-bold flex-1">Prescrições rápidas — Receituário</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Nova prescrição</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar prescrição rápida' : 'Nova prescrição rápida'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Título (rótulo curto) *</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Dipirona 500mg" />
                </div>
                <div>
                  <Label>Conteúdo *</Label>
                  <Textarea rows={6} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                    placeholder="Ex.: Dipirona 500mg — 1 comprimido via oral a cada 6 horas em caso de dor por até 3 dias." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={save}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Modelos configurados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                Nenhuma prescrição rápida cadastrada. Crie modelos de medicamentos para inserir com um clique no receituário.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map(m => (
                  <div key={m.id} className="border rounded-lg p-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{m.title}</div>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">{m.content}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(m)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(m)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
