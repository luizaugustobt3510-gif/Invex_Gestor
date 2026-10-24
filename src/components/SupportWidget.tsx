import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, X, Send, ChevronLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';

type Tutorial = { id: string; titulo: string; categoria: string; passos: string[] };
type Ticket = { id: string; assunto: string; status: string; created_at: string };
type Msg = { id: string; mensagem: string; from_support: boolean; created_at: string };

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function SupportWidget() {
  const { user } = useAuth();
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, [user]);
  const [open, setOpen] = useState(false);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [q, setQ] = useState('');
  const [selTut, setSelTut] = useState<Tutorial | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [assunto, setAssunto] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadTickets = async () => {
    if (!uid) return;
    const { data } = await supabase.from('support_tickets').select('id,assunto,status,created_at')
      .eq('user_id', uid!).order('created_at', { ascending: false });
    const list = (data ?? []) as Ticket[];
    setTickets(list);
    setViewTicket((cur) => cur ? list.find((t) => t.id === cur.id) ?? null : list.find((t) => t.status === 'aberto') ?? null);
  };

  useEffect(() => {
    if (!open || !uid) return;
    supabase.from('support_tutorials').select('id,titulo,categoria,passos').eq('is_active', true).order('ordem')
      .then(({ data }) => setTutorials((data ?? []) as Tutorial[]));
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, uid]);

  useEffect(() => {
    if (!viewTicket) { setMsgs([]); return; }
    const load = () => supabase.from('support_messages').select('id,mensagem,from_support,created_at')
      .eq('ticket_id', viewTicket.id).order('created_at').then(({ data }) => setMsgs((data ?? []) as Msg[]));
    load();
    const ch = supabase.channel(`sup-${viewTicket.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${viewTicket.id}` }, () => { load(); loadTickets(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTicket?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs]);

  const filtered = useMemo(() => tutorials.filter((t) =>
    !q || norm(t.titulo + ' ' + t.categoria + ' ' + t.passos.join(' ')).includes(norm(q))), [tutorials, q]);

  if (!user || !uid) return null;
  const openTicket = tickets.find((t) => t.status === 'aberto');

  const createTicket = async () => {
    if (!assunto.trim() || !text.trim()) return toast.error('Preencha o assunto e a mensagem');
    setSending(true);
    const { data, error } = await supabase.from('support_tickets').insert({
      user_id: uid!, company_id: user.companyId ?? null, user_name: user.nome ?? user.email,
      assunto: assunto.trim(),
    }).select('id,assunto,status,created_at').single();
    if (error || !data) { setSending(false); return toast.error('Não foi possível abrir o chamado'); }
    await supabase.from('support_messages').insert({ ticket_id: data.id, sender_id: uid!, mensagem: text.trim() });
    setSending(false); setAssunto(''); setText('');
    setViewTicket(data as Ticket); loadTickets();
    toast.success('Chamado aberto! O suporte vai responder aqui.');
  };

  const sendMsg = async () => {
    if (!viewTicket || !text.trim()) return;
    setSending(true);
    const { error } = await supabase.from('support_messages').insert({ ticket_id: viewTicket.id, sender_id: uid!, mensagem: text.trim() });
    setSending(false);
    if (error) return toast.error('Não foi possível enviar');
    setText('');
  };

  return (
    <>
      {!open && (
        <Button onClick={() => setOpen(true)} size="icon" aria-label="Ajuda e suporte"
          className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full shadow-lg">
          <HelpCircle className="h-7 w-7" />
        </Button>
      )}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[min(600px,85dvh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <span className="font-semibold">Precisa de ajuda?</span>
            <button onClick={() => setOpen(false)} aria-label="Fechar"><X className="h-5 w-5" /></button>
          </div>
          <Tabs defaultValue="tutoriais" className="flex flex-1 flex-col overflow-hidden">
            <TabsList className="m-2 grid grid-cols-2">
              <TabsTrigger value="tutoriais">Tutoriais</TabsTrigger>
              <TabsTrigger value="suporte">Falar com suporte</TabsTrigger>
            </TabsList>

            <TabsContent value="tutoriais" className="mt-0 flex-1 overflow-y-auto px-3 pb-3">
              {selTut ? (
                <div className="space-y-3">
                  <button className="flex items-center gap-1 text-sm text-primary" onClick={() => setSelTut(null)}><ChevronLeft className="h-4 w-4" />Voltar</button>
                  <h3 className="font-semibold">{selTut.titulo}</h3>
                  <ol className="space-y-2">
                    {selTut.passos.map((p, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{i + 1}</span>
                        <span className="pt-0.5">{p}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input placeholder="Buscar: anamnese, usuário..." value={q} onChange={(e) => setQ(e.target.value)} className="text-base" />
                  {filtered.map((t) => (
                    <button key={t.id} onClick={() => setSelTut(t)} className="w-full rounded-lg border border-border p-3 text-left hover:bg-muted">
                      <div className="text-sm font-medium">{t.titulo}</div>
                      <div className="text-xs text-muted-foreground">{t.categoria}</div>
                    </button>
                  ))}
                  {filtered.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nada encontrado. Fale com o suporte!</p>}
                </div>
              )}
            </TabsContent>

            <TabsContent value="suporte" className="mt-0 flex flex-1 flex-col overflow-hidden px-3 pb-3">
              {viewTicket ? (
                <>
                  <div className="flex items-center justify-between pb-2">
                    <button className="flex items-center gap-1 text-sm text-primary" onClick={() => setViewTicket(null)}><ChevronLeft className="h-4 w-4" />Chamados</button>
                    <Badge variant={viewTicket.status === 'aberto' ? 'default' : 'secondary'}>{viewTicket.status === 'aberto' ? 'Aberto' : 'Encerrado'}</Badge>
                  </div>
                  <div className="text-sm font-medium">{viewTicket.assunto}</div>
                  <div className="my-2 flex-1 space-y-2 overflow-y-auto rounded-md bg-muted/50 p-2">
                    {msgs.map((m) => (
                      <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.from_support ? 'bg-card border border-border' : 'ml-auto bg-primary text-primary-foreground'}`}>
                        {m.from_support && <div className="text-xs font-semibold text-primary">Suporte Invex</div>}
                        <div className="whitespace-pre-wrap">{m.mensagem}</div>
                        <div className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleString('pt-BR')}</div>
                      </div>
                    ))}
                    <div ref={endRef} />
                  </div>
                  {viewTicket.status === 'aberto' ? (
                    <div className="flex gap-2">
                      <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva sua mensagem" className="text-base" />
                      <Button size="icon" onClick={sendMsg} disabled={sending} aria-label="Enviar"><Send className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground">Chamado encerrado. Abra um novo se precisar.</p>
                  )}
                </>
              ) : (
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {!openTicket && (
                    <div className="space-y-2 rounded-lg border border-border p-3">
                      <div className="flex items-center gap-1 text-sm font-semibold"><Plus className="h-4 w-4" />Novo chamado</div>
                      <Input placeholder="Assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)} className="text-base" />
                      <Textarea rows={3} placeholder="Descreva o que precisa" value={text} onChange={(e) => setText(e.target.value)} className="text-base" />
                      <Button className="w-full" onClick={createTicket} disabled={sending}>Enviar ao suporte</Button>
                    </div>
                  )}
                  {tickets.map((t) => (
                    <button key={t.id} onClick={() => setViewTicket(t)} className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left hover:bg-muted">
                      <div>
                        <div className="text-sm font-medium">{t.assunto}</div>
                        <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('pt-BR')}</div>
                      </div>
                      <Badge variant={t.status === 'aberto' ? 'default' : 'secondary'}>{t.status === 'aberto' ? 'Aberto' : 'Encerrado'}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </>
  );
}
