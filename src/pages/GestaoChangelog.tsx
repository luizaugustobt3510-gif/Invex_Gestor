import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Send, FileText, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface SU {
  id: string;
  versao: string;
  titulo: string;
  data_atualizacao: string;
  descricao: string;
  novas_funcionalidades: string[];
  correcoes: string[];
  status: 'publicada' | 'rascunho';
}

const empty = (): SU => ({
  id: '', versao: '', titulo: '', data_atualizacao: new Date().toISOString().slice(0,10),
  descricao: '', novas_funcionalidades: [], correcoes: [], status: 'rascunho',
});

const GestaoChangelog = () => {
  const [items, setItems] = useState<SU[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SU | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('system_updates')
      .select('*')
      .order('data_atualizacao', { ascending: false })
      .order('created_at', { ascending: false });
    setItems((data || []).map((u: any) => ({
      ...u,
      novas_funcionalidades: Array.isArray(u.novas_funcionalidades) ? u.novas_funcionalidades : [],
      correcoes: Array.isArray(u.correcoes) ? u.correcoes : [],
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.versao.trim() || !editing.titulo.trim()) {
      toast.error('Informe versão e título.');
      return;
    }
    setSaving(true);
    const payload = {
      versao: editing.versao.trim(),
      titulo: editing.titulo.trim(),
      data_atualizacao: editing.data_atualizacao,
      descricao: editing.descricao,
      novas_funcionalidades: editing.novas_funcionalidades.filter(s => s.trim()),
      correcoes: editing.correcoes.filter(s => s.trim()),
      status: editing.status,
    };
    try {
      if (editing.id) {
        const { error } = await supabase.from('system_updates').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Atualização salva.');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('system_updates').insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        toast.success('Atualização criada.');
      }
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u: SU) => {
    const novo = u.status === 'publicada' ? 'rascunho' : 'publicada';
    if (novo === 'publicada') {
      // Quando republica, limpa visualizações para que apareça para todos novamente
      await supabase.from('user_update_views').delete().eq('update_id', u.id);
    }
    const { error } = await supabase.from('system_updates').update({ status: novo }).eq('id', u.id);
    if (error) { toast.error(error.message); return; }
    toast.success(novo === 'publicada' ? 'Publicada para todos os usuários.' : 'Movida para rascunho.');
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir esta atualização? Esta ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('system_updates').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Excluída.');
    load();
  };

  const updateList = (key: 'novas_funcionalidades' | 'correcoes', text: string) => {
    if (!editing) return;
    setEditing({ ...editing, [key]: text.split('\n') });
  };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Gestão de Atualizações</h1>
            <p className="text-sm text-muted-foreground">Cadastre, edite e publique as novidades exibidas aos usuários.</p>
          </div>
          <Button onClick={() => setEditing(empty())}><Plus className="w-4 h-4" />Nova atualização</Button>
        </div>

        {loading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
        ) : items.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma atualização cadastrada.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {items.map(u => (
              <Card key={u.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">v{u.versao}</Badge>
                        <Badge variant={u.status === 'publicada' ? 'default' : 'outline'}>
                          {u.status === 'publicada' ? 'Publicada' : 'Rascunho'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{u.data_atualizacao}</span>
                      </div>
                      <CardTitle className="text-base">{u.titulo}</CardTitle>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => toggleStatus(u)}>
                        {u.status === 'publicada' ? <FileText className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                        {u.status === 'publicada' ? 'Despublicar' : 'Publicar'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(u)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => remove(u.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  ✨ {u.novas_funcionalidades.length} novidades · 🔧 {u.correcoes.length} correções
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing?.id ? 'Editar atualização' : 'Nova atualização'}</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Versão</Label>
                    <Input value={editing.versao} onChange={e => setEditing({ ...editing, versao: e.target.value })} placeholder="2.3.0" />
                  </div>
                  <div>
                    <Label>Data</Label>
                    <Input type="date" value={editing.data_atualizacao} onChange={e => setEditing({ ...editing, data_atualizacao: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Título</Label>
                  <Input value={editing.titulo} onChange={e => setEditing({ ...editing, titulo: e.target.value })} placeholder="Novidades da Versão 2.3.0" />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea rows={2} value={editing.descricao} onChange={e => setEditing({ ...editing, descricao: e.target.value })} placeholder="Resumo curto da atualização" />
                </div>
                <div>
                  <Label>Novas funcionalidades <span className="text-xs text-muted-foreground">(uma por linha)</span></Label>
                  <Textarea rows={5} value={editing.novas_funcionalidades.join('\n')} onChange={e => updateList('novas_funcionalidades', e.target.value)} placeholder="Sistema de chamados implementado&#10;Dashboard com indicadores em tempo real" />
                </div>
                <div>
                  <Label>Correções <span className="text-xs text-muted-foreground">(uma por linha)</span></Label>
                  <Textarea rows={5} value={editing.correcoes.join('\n')} onChange={e => updateList('correcoes', e.target.value)} placeholder="Corrigido erro na consulta de estoque" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="mb-0">Status:</Label>
                  <Button size="sm" variant={editing.status === 'rascunho' ? 'default' : 'outline'} onClick={() => setEditing({ ...editing, status: 'rascunho' })}>Rascunho</Button>
                  <Button size="sm" variant={editing.status === 'publicada' ? 'default' : 'outline'} onClick={() => setEditing({ ...editing, status: 'publicada' })}>Publicada</Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default GestaoChangelog;
