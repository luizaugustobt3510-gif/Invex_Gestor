import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useAnatomicalRegions, AnatomicalRegion } from '@/hooks/useAnatomicalRegions';
import { CATEGORIA_LABELS, LADO_LABELS } from '@/components/clinica/anatomyMaps';

const CATEGORIAS = Object.keys(CATEGORIA_LABELS);
const LADOS = ['nao_aplica', 'direito', 'esquerdo', 'bilateral'];

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

interface FormState {
  nome: string; categoria: string; lado: string; ordem: number; is_active: boolean;
}
const emptyForm: FormState = { nome: '', categoria: 'cabeca', lado: 'nao_aplica', ordem: 0, is_active: true };

export default function RegioesAnatomicas() {
  const { user } = useAuth();
  const { regions, loading, reload } = useAnatomicalRegions(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnatomicalRegion | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('todas');

  const grouped = useMemo(() => {
    const list = filter === 'todas' ? regions : regions.filter(r => r.categoria === filter);
    const g: Record<string, AnatomicalRegion[]> = {};
    list.forEach(r => { (g[r.categoria] ||= []).push(r); });
    return g;
  }, [regions, filter]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, ordem: (regions.reduce((m, r) => Math.max(m, r.ordem), 0) || 0) + 10 });
    setOpen(true);
  };
  const openEdit = (r: AnatomicalRegion) => {
    setEditing(r);
    setForm({ nome: r.nome, categoria: r.categoria, lado: r.lado || 'nao_aplica', ordem: r.ordem, is_active: r.is_active });
    setOpen(true);
  };

  const save = async () => {
    if (!user?.companyId || saving) return;
    if (!form.nome.trim()) { toast.error('Informe o nome da região'); return; }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        categoria: form.categoria,
        lado: form.lado === 'nao_aplica' ? null : form.lado,
        ordem: Number(form.ordem) || 0,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from('anatomical_regions').update(payload).eq('id', editing.id);
        if (error) { toast.error(error.message); return; }
        toast.success('Região atualizada');
      } else {
        let slug = slugify(form.nome);
        if (!slug) slug = `regiao_${Date.now()}`;
        if (regions.some(r => r.slug === slug)) slug = `${slug}_${Date.now().toString().slice(-4)}`;
        const { error } = await supabase.from('anatomical_regions')
          .insert({ ...payload, slug, company_id: user.companyId });
        if (error) { toast.error(error.message); return; }
        toast.success('Região criada');
      }
      setOpen(false);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r: AnatomicalRegion) => {
    const { error } = await supabase.from('anatomical_regions')
      .update({ is_active: !r.is_active }).eq('id', r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(r.is_active ? 'Região desativada' : 'Região ativada');
    reload();
  };

  const remove = async (r: AnatomicalRegion) => {
    if (!confirm(`Excluir a região "${r.nome}"?`)) return;
    const { error } = await supabase.from('anatomical_regions').delete().eq('id', r.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Região excluída');
    reload();
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-4">
        <Tabs defaultValue="regioes">
          <TabsList>
            <TabsTrigger value="regioes">Regiões</TabsTrigger>
            <TabsTrigger value="mapas">Mapas anatômicos</TabsTrigger>
          </TabsList>
          <TabsContent value="mapas" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Mapas anatômicos</CardTitle></CardHeader>
              <CardContent><MapasAnatomicos /></CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="regioes" className="mt-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" /> Regiões Anatômicas
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-9 w-[190px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as categorias</SelectItem>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Nova região</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <div className="text-center text-muted-foreground py-8">Carregando...</div>
            ) : regions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Nenhuma região cadastrada.</div>
            ) : (
              Object.entries(grouped).map(([cat, list]) => (
                <div key={cat} className="space-y-2">
                  <div className="text-sm font-semibold">{CATEGORIA_LABELS[cat] || cat}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {list.map(r => (
                      <div key={r.id} className="flex items-center justify-between gap-2 border rounded-lg px-3 py-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium truncate ${!r.is_active ? 'text-muted-foreground line-through' : ''}`}>{r.nome}</span>
                            {r.lado && <Badge variant="outline" className="text-[10px]">{LADO_LABELS[r.lado] || r.lado}</Badge>}
                          </div>
                          <div className="text-[11px] text-muted-foreground">ordem {r.ordem}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(r)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar região' : 'Nova região anatômica'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Temporal direita" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Lado</Label>
                  <Select value={form.lado} onValueChange={v => setForm({ ...form, lado: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LADOS.map(l => <SelectItem key={l} value={l}>{LADO_LABELS[l]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <Label>Ordem de exibição</Label>
                  <Input type="number" value={form.ordem} onChange={e => setForm({ ...form, ordem: Number(e.target.value) })} />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                  <Label className="mb-0">Ativa</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
