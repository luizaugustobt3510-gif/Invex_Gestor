import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Crown, Loader2, RefreshCw, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { filterPersonalAccounts, type AppFilter, type PersonalAccount } from '@/lib/personalAccounts';
import { deleteBlockReason, manualPremiumActive, PREMIUM_APPS, type PremiumApp } from '@/lib/personalAccountAdmin';

const APPS: { key: AppFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'rotina', label: 'Rotina' },
  { key: 'fitness', label: 'Fitness' },
  { key: 'financas', label: 'Finanças' },
];

const fmt = (d: string | null) => (d ? format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—');
const todaySP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

function AppBadges({ a }: { a: PersonalAccount }) {
  const items = [
    a.usa_rotina && { label: 'Rotina', premium: a.rotina_premium },
    a.usa_fitness && { label: 'Fitness', premium: a.fitness_premium },
    a.usa_financas && { label: 'Finanças', premium: a.financas_premium },
  ].filter(Boolean) as { label: string; premium: boolean }[];
  // Premium liberado em app ainda não aberto também aparece
  const extra = [
    !a.usa_rotina && a.rotina_premium && 'Rotina',
    !a.usa_fitness && a.fitness_premium && 'Fitness',
    !a.usa_financas && a.financas_premium && 'Finanças',
  ].filter(Boolean) as string[];
  if (!items.length && !extra.length) return <span className="text-xs text-muted-foreground">Ainda não abriu nenhum app</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(i => (
        <Badge key={i.label} variant={i.premium ? 'default' : 'secondary'}>{i.label}{i.premium ? ' · Premium' : ''}</Badge>
      ))}
      {extra.map(l => <Badge key={l} variant="default">{l} · Premium</Badge>)}
    </div>
  );
}

type ManualState = Record<PremiumApp, { ativo: boolean; fim: string }>;
const EMPTY: ManualState = { rotina: { ativo: false, fim: '' }, fitness: { ativo: false, fim: '' }, financas: { ativo: false, fim: '' } };

/** Diálogo para liberar/remover Premium manual em cada app. */
function PremiumDialog({ account, onClose, onSaved }: { account: PersonalAccount | null; onClose: () => void; onSaved: () => void }) {
  const [state, setState] = useState<ManualState>(EMPTY);
  const [initial, setInitial] = useState<ManualState>(EMPTY);
  const [subs, setSubs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!account) return;
    const uid = account.user_id;
    setLoading(true);
    (async () => {
      const today = todaySP();
      const [r, f, fi, s] = await Promise.all([
        supabase.from('routine_access').select('plano, premium_status, premium_fim').eq('user_id', uid).maybeSingle(),
        supabase.from('fitness_premium_grants').select('ativo, fim').eq('user_id', uid).maybeSingle(),
        supabase.from('financas_premium_grants').select('ativo, fim').eq('user_id', uid).maybeSingle(),
        supabase.from('subscriptions').select('product_id, status').eq('user_id', uid),
      ]);
      const next: ManualState = {
        rotina: {
          ativo: !!r.data && manualPremiumActive(r.data.plano === 'premium' && r.data.premium_status === 'ativo', r.data.premium_fim, today),
          fim: r.data?.premium_fim || '',
        },
        fitness: { ativo: !!f.data && manualPremiumActive(f.data.ativo, f.data.fim, today), fim: f.data?.fim || '' },
        financas: { ativo: !!fi.data && manualPremiumActive(fi.data.ativo, fi.data.fim, today), fim: fi.data?.fim || '' },
      };
      setState(next); setInitial(next);
      setSubs((s.data || []).filter(x => ['active', 'trialing', 'past_due'].includes(x.status)).map(x => x.product_id));
      setLoading(false);
    })();
  }, [account]);

  const save = async () => {
    if (!account) return;
    setSaving(true);
    for (const { key } of PREMIUM_APPS) {
      const cur = state[key], old = initial[key];
      if (cur.ativo === old.ativo && cur.fim === old.fim) continue;
      const { error } = await supabase.rpc('admin_set_app_premium', {
        _user_id: account.user_id, _app: key, _ativo: cur.ativo, _fim: (cur.ativo && cur.fim) ? cur.fim : (null as any),
      });
      if (error) { setSaving(false); return toast.error('Não foi possível salvar o Premium.'); }
    }
    setSaving(false);
    toast.success('Premium atualizado.');
    onSaved(); onClose();
  };

  const subLabel = (key: PremiumApp) => subs.includes(`${key}_premium`) ? 'Tem assinatura paga ativa' : null;

  return (
    <Dialog open={!!account} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-primary" />Premium manual</DialogTitle>
          <DialogDescription className="break-all">{account?.nome || 'Sem nome'} · {account?.email}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-8 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            {PREMIUM_APPS.map(({ key, label }) => (
              <div key={key} className="rounded-md border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`pm-${key}`} className="font-medium">{label}</Label>
                  <Switch id={`pm-${key}`} checked={state[key].ativo}
                    onCheckedChange={v => setState(s => ({ ...s, [key]: { ...s[key], ativo: v } }))} />
                </div>
                {subLabel(key) && <p className="text-xs text-muted-foreground">{subLabel(key)} (continua valendo mesmo se desligar aqui)</p>}
                {state[key].ativo && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`pf-${key}`} className="text-xs text-muted-foreground whitespace-nowrap">Válido até</Label>
                    <Input id={`pf-${key}`} type="date" className="text-base sm:text-sm" value={state[key].fim}
                      onChange={e => setState(s => ({ ...s, [key]: { ...s[key], fim: e.target.value } }))} />
                  </div>
                )}
                {state[key].ativo && !state[key].fim && <p className="text-xs text-muted-foreground">Sem data = Premium sem prazo.</p>}
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={loading || saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Super Admin vê e gerencia as contas do Invex Rotina, Fitness e Finanças (sem ver os dados de dentro dos apps). */
export default function ContasApps() {
  const [rows, setRows] = useState<PersonalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [q, setQ] = useState('');
  const [app, setApp] = useState<AppFilter>('todos');
  const [myId, setMyId] = useState<string | null>(null);
  const [premiumFor, setPremiumFor] = useState<PersonalAccount | null>(null);
  const [deleteFor, setDeleteFor] = useState<PersonalAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true); setErro(false);
    const { data, error } = await supabase.rpc('admin_personal_accounts');
    if (error) setErro(true); else setRows((data as PersonalAccount[]) || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);

  const list = useMemo(() => filterPersonalAccounts(rows, app, q), [rows, app, q]);
  const count = (k: AppFilter) => filterPersonalAccounts(rows, k, '').length;

  const doDelete = async () => {
    if (!deleteFor) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke('delete-personal-account', { body: { user_id: deleteFor.user_id } });
    setDeleting(false);
    if (error || !data?.success) {
      let msg = data?.error as string | undefined;
      if (!msg && error && 'context' in error) {
        try { msg = (await (error as any).context.json())?.error; } catch { /* sem corpo */ }
      }
      return toast.error(msg || 'Não foi possível excluir a conta.');
    }
    toast.success('Conta excluída.');
    setRows(r => r.filter(x => x.user_id !== deleteFor.user_id));
    setDeleteFor(null);
  };

  return (
    <MainLayout>
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Contas dos apps (Rotina, Fitness, Finanças)</CardTitle>
          <Button size="sm" variant="outline" onClick={load} disabled={loading} aria-label="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {APPS.map(a => (
              <Button key={a.key} size="sm" variant={app === a.key ? 'default' : 'outline'} onClick={() => setApp(a.key)}>
                {a.label} <span className="ml-1 opacity-70">({count(a.key)})</span>
              </Button>
            ))}
          </div>
          <Input placeholder="Buscar por nome, e-mail ou telefone" value={q} onChange={e => setQ(e.target.value)} className="text-base sm:text-sm" />
          <p className="text-xs text-muted-foreground">
            Aqui aparecem só os dados da conta. Lançamentos, treinos e tarefas de cada pessoa continuam privados.
          </p>

          {loading ? (
            <div className="py-10 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : erro ? (
            <p className="py-8 text-center text-destructive">Não foi possível carregar as contas.</p>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhuma conta encontrada.</p>
          ) : (
            <div className="divide-y divide-border rounded-md border border-border">
              {list.map(a => {
                const block = deleteBlockReason(a, myId);
                return (
                  <div key={a.user_id} className="grid gap-2 p-3 md:grid-cols-[1.4fr_1.2fr_1fr_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{a.nome || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground break-all">{a.email}</p>
                      {(a.telefone || a.cidade) && (
                        <p className="text-xs text-muted-foreground">{[a.telefone, [a.cidade, a.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <AppBadges a={a} />
                      <div className="flex flex-wrap gap-1">
                        {a.login_google && <Badge variant="outline">Google</Badge>}
                        <Badge variant={a.email_confirmado ? 'outline' : 'destructive'}>{a.email_confirmado ? 'E-mail confirmado' : 'E-mail não confirmado'}</Badge>
                        {a.tem_empresa && <Badge variant="outline">Também no Gestor{a.empresa ? `: ${a.empresa}` : ''}</Badge>}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground md:text-right">
                      <p>Criada: {fmt(a.created_at)}</p>
                      <p>Último acesso: {fmt(a.last_sign_in_at)}</p>
                    </div>
                    <div className="flex gap-2 md:justify-end">
                      <Button size="sm" variant="outline" onClick={() => setPremiumFor(a)}>
                        <Crown className="mr-1 h-4 w-4" />Premium
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive"
                        disabled={!!block} title={block || 'Excluir conta'} aria-label="Excluir conta"
                        onClick={() => setDeleteFor(a)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <PremiumDialog account={premiumFor} onClose={() => setPremiumFor(null)} onSaved={load} />

      <AlertDialog open={!!deleteFor} onOpenChange={o => !o && !deleting && setDeleteFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta conta de vez?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block break-all font-medium text-foreground">{deleteFor?.nome || 'Sem nome'} · {deleteFor?.email}</span>
              <span className="block">Apaga o login e tudo da pessoa no Rotina, no Fitness e no Finanças (tarefas, treinos, lançamentos, fotos). Não dá para desfazer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={e => { e.preventDefault(); doDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
