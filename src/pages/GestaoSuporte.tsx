import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

type Ticket = { id: string; assunto: string; status: string; created_at: string; user_name: string | null; company_id: string | null };
type Msg = { id: string; mensagem: string; from_support: boolean; created_at: string };
type Tut = { id: string; titulo: string; categoria: string; passos: string[]; ordem: number; is_active: boolean };

export default function GestaoSuporte() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<Ticket | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<'aberto' | 'encerrado'>('aberto');
  const [tuts, setTuts] = useState<Tut[]>([]);

  const loadTickets = async () => {
    const { data } = await supabase.from('support_tickets').select('id,assunto,status,created_at,user_name,company_id').order('created_at', { ascending: false });
    setTickets((data ?? []) as Ticket[]);
  };
  const loadTuts = async () => {
    const { data } = await supabase.from('support_tutorials').select('*').order('ordem');
    setTuts((data ?? []) as Tut[]);
  };

  useEffect(() => {
    loadTickets(); loadTuts();
    supabase.from('companies').select('id,nome').then(({ data }) => {
      const m: Record<string, string> = {};
      (data ?? []).forEach((c: any) => { m[c.id] = c.nome; });
      setCompanies(m);
    });
    const ch = supabase.channel(`sup-admin-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, () => { loadTickets(); setSel((s) => (s ? { ...s } : s)); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!sel) { setMsgs([]); return; }
    supabase.from('support_messages').select('id,mensagem,from_support,created_at').eq('ticket_id', sel.id).order('created_at')
      .then(({ data }) => setMsgs((data ?? []) as Msg[]));
  }, [sel]);

  const reply = async () => {
    if (!sel || !text.trim() || !user) return;
    const { error } = await supabase.from('support_messages').insert({ ticket_id: sel.id, sender_id: user.id, from_support: true, mensagem: text.trim() });
    if (error) return toast.error('Erro ao responder');
    setText(''); setSel({ ...sel });
  };
  const setStatus = async (status: string) => {
    if (!sel) return;
    const { error } = await supabase.from('support_tickets').update({ status, closed_at: status === 'encerrado' ? new Date().toISOString() : null }).eq('id', sel.id);
    if (error) return toast.error('Erro ao atualizar');
    toast.success(status === 'encerrado' ? 'Chamado encerrado' : 'Chamado reaberto');
    setSel({ ...sel, status }); loadTickets();
  };

  const saveTut = async (t: Tut) => {
    const passos = t.passos.map((p) => p.trim()).filter(Boolean);
    const { error } = await supabase.from('support_tutorials').update({ titulo: t.titulo, categoria: t.categoria, passos, ordem: t.ordem, is_active: t.is_active }).eq('id', t.id);
    if (error) return toast.error('Erro ao salvar'); toast.success('Tutorial salvo'); loadTuts();
  };
  const addTut = async () => {
    const { error } = await supabase.from('support_tutorials').insert({ titulo: 'Novo tutorial', categoria: 'Geral', passos: ['Primeiro passo'], ordem: tuts.length + 1 });
    if (error) return toast.error('Erro ao criar'); loadTuts();
  };
  const delTut = async (id: string) => {
    if (!confirm('Excluir este tutorial?')) return;
    const { error } = await supabase.from('support_tutorials').delete().eq('id', id);
    if (error) return toast.error('Erro ao excluir');
    setTuts((l) => l.filter((t) => t.id !== id));
  };
  const upd = (id: string, patch: Partial<Tut>) => setTuts((l) => l.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const list = tickets.filter((t) => t.status === filter);

  return (
    <MainLayout>
      <h1 className="mb-4 text-2xl font-bold">Central de Suporte</h1>
      <Tabs defaultValue="chamados">
        <TabsList><TabsTrigger value="chamados">Chamados ({tickets.filter((t) => t.status === 'aberto').length} abertos)</TabsTrigger><TabsTrigger value="tutoriais">Tutoriais</TabsTrigger></TabsList>

        <TabsContent value="chamados" className="grid gap-4 md:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex gap-2">
                <Button size="sm" variant={filter === 'aberto' ? 'default' : 'outline'} onClick={() => setFilter('aberto')}>Abertos</Button>
                <Button size="sm" variant={filter === 'encerrado' ? 'default' : 'outline'} onClick={() => setFilter('encerrado')}>Encerrados</Button>
              </div>
            </CardHeader>
            <CardContent className="max-h-[65vh] space-y-2 overflow-y-auto">
              {list.map((t) => (
                <button key={t.id} onClick={() => setSel(t)} className={`w-full rounded-lg border p-3 text-left hover:bg-muted ${sel?.id === t.id ? 'border-primary' : 'border-border'}`}>
                  <div className="text-sm font-medium">{t.assunto}</div>
                  <div className="text-xs text-muted-foreground">{t.user_name} · {t.company_id ? companies[t.company_id] ?? '' : ''}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString('pt-BR')}</div>
                </button>
              ))}
              {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum chamado.</p>}
            </CardContent>
          </Card>
          <Card>
            {sel ? (
              <>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-lg">{sel.assunto}</CardTitle>
                    <p className="text-sm text-muted-foreground">{sel.user_name} · {sel.company_id ? companies[sel.company_id] ?? '' : ''}</p>
                  </div>
                  {sel.status === 'aberto'
                    ? <Button variant="outline" onClick={() => setStatus('encerrado')}>Encerrar chamado</Button>
                    : <div className="flex items-center gap-2"><Badge variant="secondary">Encerrado</Badge><Button size="sm" variant="ghost" onClick={() => setStatus('aberto')}>Reabrir</Button></div>}
                </CardHeader>
                <CardContent>
                  <div className="mb-3 max-h-[50vh] space-y-2 overflow-y-auto rounded-md bg-muted/50 p-3">
                    {msgs.map((m) => (
                      <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.from_support ? 'ml-auto bg-primary text-primary-foreground' : 'border border-border bg-card'}`}>
                        <div className="whitespace-pre-wrap">{m.mensagem}</div>
                        <div className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleString('pt-BR')}</div>
                      </div>
                    ))}
                  </div>
                  {sel.status === 'aberto' && (
                    <div className="flex gap-2">
                      <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Responder" className="text-base" />
                      <Button onClick={reply}><Send className="h-4 w-4" /></Button>
                    </div>
                  )}
                </CardContent>
              </>
            ) : <CardContent className="py-12 text-center text-muted-foreground">Selecione um chamado</CardContent>}
          </Card>
        </TabsContent>

        <TabsContent value="tutoriais" className="space-y-3">
          <Button onClick={addTut} className="gap-2"><Plus className="h-4 w-4" />Novo tutorial</Button>
          {tuts.map((t) => (
            <Card key={t.id}>
              <CardContent className="space-y-2 pt-4">
                <div className="grid gap-2 md:grid-cols-[1fr_200px_90px]">
                  <Input value={t.titulo} onChange={(e) => upd(t.id, { titulo: e.target.value })} placeholder="Título" />
                  <Input value={t.categoria} onChange={(e) => upd(t.id, { categoria: e.target.value })} placeholder="Categoria" />
                  <Input type="number" value={t.ordem} onChange={(e) => upd(t.id, { ordem: Number(e.target.value) })} />
                </div>
                <Textarea rows={Math.max(3, t.passos.length)} value={t.passos.join('\n')} onChange={(e) => upd(t.id, { passos: e.target.value.split('\n') })} placeholder="Um passo por linha" />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm"><Switch checked={t.is_active} onCheckedChange={(v) => upd(t.id, { is_active: v })} />Visível</label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => delTut(t.id)}><Trash2 className="h-4 w-4" /></Button>
                    <Button size="sm" onClick={() => saveTut(t)} className="gap-1"><Save className="h-4 w-4" />Salvar</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
