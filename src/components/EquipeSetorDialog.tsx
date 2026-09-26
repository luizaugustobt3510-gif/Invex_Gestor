import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2, ShieldCheck } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sector: { id: string; nome: string } | null;
  companyId: string;
  canManage: boolean;
}

interface Member { id: string; user_id: string; is_admin: boolean }
interface Person { user_id: string; nome: string | null; email: string | null }

export function EquipeSetorDialog({ open, onOpenChange, sector, companyId, canManage }: Props) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [novo, setNovo] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!sector) return;
    const [m, p] = await Promise.all([
      supabase.from('sector_members').select('id, user_id, is_admin').eq('sector_id', sector.id),
      supabase.from('profiles').select('user_id, nome, email').eq('company_id', companyId).order('nome'),
    ]);
    if (m.error) toast({ title: 'Erro', description: 'Não foi possível carregar a equipe.', variant: 'destructive' });
    setMembers((m.data as Member[]) || []);
    setPeople((p.data as Person[]) || []);
  };

  useEffect(() => { if (open) load(); }, [open, sector?.id]);

  const nameOf = (id: string) => {
    const p = people.find((x) => x.user_id === id);
    return p?.nome || p?.email?.replace('@usuarios.invexgestor.local', '') || 'Usuário';
  };

  const add = async () => {
    if (!sector || !novo) return;
    setBusy(true);
    const { error } = await supabase.from('sector_members').insert({ company_id: companyId, sector_id: sector.id, user_id: novo });
    setBusy(false);
    if (error) return toast({ title: 'Erro', description: 'Não foi possível adicionar.', variant: 'destructive' });
    setNovo('');
    load();
  };

  const toggleAdmin = async (m: Member, v: boolean) => {
    const { error } = await supabase.from('sector_members').update({ is_admin: v }).eq('id', m.id);
    if (error) return toast({ title: 'Erro', description: 'Sem permissão para alterar.', variant: 'destructive' });
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_admin: v } : x)));
  };

  const remove = async (m: Member) => {
    const { error } = await supabase.from('sector_members').delete().eq('id', m.id);
    if (error) return toast({ title: 'Erro', description: 'Sem permissão para remover.', variant: 'destructive' });
    setMembers((prev) => prev.filter((x) => x.id !== m.id));
  };

  const disponiveis = people.filter((p) => !members.some((m) => m.user_id === p.user_id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Equipe do setor {sector?.nome}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          O admin do setor pode alterar e excluir dispensações, anamneses e assinaturas das pessoas deste setor.
        </p>
        {canManage && (
          <div className="flex gap-2">
            <Select value={novo} onValueChange={setNovo}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Adicionar pessoa" /></SelectTrigger>
              <SelectContent>
                {disponiveis.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>{nameOf(p.user_id)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={add} disabled={!novo || busy}>Adicionar</Button>
          </div>
        )}
        <div className="space-y-2 max-h-80 overflow-auto">
          {members.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Ninguém neste setor ainda.</p>}
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between border rounded-md px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                {m.is_admin && <ShieldCheck className="w-4 h-4 text-primary" />}
                {nameOf(m.user_id)}
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Admin do setor
                  <Switch checked={m.is_admin} disabled={!canManage} onCheckedChange={(v) => toggleAdmin(m, v)} />
                </label>
                {canManage && (
                  <Button variant="ghost" size="icon" onClick={() => remove(m)}><Trash2 className="w-4 h-4" /></Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
