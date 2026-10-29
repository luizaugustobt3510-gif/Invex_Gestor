import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CalendarCheck, History } from 'lucide-react';
import { format } from 'date-fns';

const db = supabase as any;
interface Row { user_id: string; nome: string | null; email: string | null; status: string; plano: string; premium_status: string; premium_inicio: string | null; premium_fim: string | null; origem: string; created_at: string }

export default function GestaoRotina() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [grant, setGrant] = useState('');
  const [edit, setEdit] = useState<Row | null>(null);
  const [hist, setHist] = useState<any[] | null>(null);

  const load = async () => {
    const { data } = await db.from('routine_access').select('*').order('created_at', { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { load(); }, []);

  const doGrant = async () => {
    if (!grant.trim()) return;
    const { error } = await db.rpc('routine_admin_grant', { _email: grant.trim() });
    if (error) return toast.error(error.message.includes('não encontrado') ? 'Nenhuma conta com esse e-mail.' : 'Não foi possível conceder.');
    toast.success('Acesso concedido.'); setGrant(''); load();
  };

  const save = async () => {
    if (!edit) return;
    const { error } = await db.from('routine_access').update({
      status: edit.status, plano: edit.plano, premium_status: edit.plano === 'premium' ? edit.premium_status : 'nenhum',
      premium_inicio: edit.premium_inicio || null, premium_fim: edit.premium_fim || null,
    }).eq('user_id', edit.user_id);
    if (error) return toast.error('Erro ao salvar.');
    toast.success('Atualizado.'); setEdit(null); load();
  };

  const openHist = async (uid: string) => {
    const { data } = await db.from('routine_audit_logs').select('*').eq('target_user_id', uid).order('created_at', { ascending: false });
    setHist(data || []);
  };

  const list = rows.filter(r => `${r.nome} ${r.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <MainLayout>
      <Card className="max-w-5xl mx-auto">
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarCheck className="w-5 h-5" />Invex Rotina | Acessos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Buscar por nome ou e-mail" value={q} onChange={e => setQ(e.target.value)} />
            <Input placeholder="E-mail de conta existente para liberar" value={grant} onChange={e => setGrant(e.target.value)} />
            <Button onClick={doGrant}>Liberar acesso</Button>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Acesso</TableHead><TableHead>Plano</TableHead><TableHead>Validade</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {list.map(r => (
                <TableRow key={r.user_id}>
                  <TableCell><p className="font-medium">{r.nome || '—'}</p><p className="text-xs text-muted-foreground">{r.email}</p></TableCell>
                  <TableCell><Badge variant={r.status === 'ativo' ? 'default' : 'destructive'}>{r.status}</Badge></TableCell>
                  <TableCell>{r.plano === 'premium' ? `Premium (${r.premium_status})` : 'Gratuito'}</TableCell>
                  <TableCell>{r.premium_fim ? format(new Date(r.premium_fim + 'T12:00'), 'dd/MM/yyyy') : '—'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => setEdit({ ...r })}>Editar</Button>
                    <Button size="icon" variant="ghost" onClick={() => openHist(r.user_id)} aria-label="Histórico"><History className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma conta.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!edit} onOpenChange={o => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.email}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div><Label>Acesso ao produto</Label>
                <Select value={edit.status} onValueChange={v => setEdit({ ...edit, status: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="suspenso">Suspenso</SelectItem><SelectItem value="revogado">Revogado</SelectItem></SelectContent></Select></div>
              <div><Label>Plano</Label>
                <Select value={edit.plano} onValueChange={v => setEdit({ ...edit, plano: v, premium_status: v === 'premium' && edit.premium_status === 'nenhum' ? 'ativo' : edit.premium_status })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gratuito">Gratuito</SelectItem><SelectItem value="premium">Premium</SelectItem></SelectContent></Select></div>
              {edit.plano === 'premium' && (<>
                <div><Label>Status Premium</Label>
                  <Select value={edit.premium_status} onValueChange={v => setEdit({ ...edit, premium_status: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="suspenso">Suspenso</SelectItem><SelectItem value="expirado">Expirado</SelectItem></SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Início</Label><Input type="date" value={edit.premium_inicio || ''} onChange={e => setEdit({ ...edit, premium_inicio: e.target.value })} /></div>
                  <div><Label>Término</Label><Input type="date" value={edit.premium_fim || ''} onChange={e => setEdit({ ...edit, premium_fim: e.target.value })} /></div>
                </div>
              </>)}
            </div>
          )}
          <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!hist} onOpenChange={o => !o && setHist(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Histórico</DialogTitle></DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2 text-sm">
            {hist?.map(h => (
              <div key={h.id} className="border-b border-border pb-2">
                <p className="font-medium">{h.acao} <span className="text-xs text-muted-foreground">{format(new Date(h.created_at), 'dd/MM/yyyy HH:mm')}</span></p>
                {h.detalhes && <p className="text-xs text-muted-foreground break-all">{JSON.stringify(h.detalhes)}</p>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
