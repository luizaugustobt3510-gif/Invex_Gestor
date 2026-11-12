import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { filterPersonalAccounts, type AppFilter, type PersonalAccount } from '@/lib/personalAccounts';

const APPS: { key: AppFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'rotina', label: 'Rotina' },
  { key: 'fitness', label: 'Fitness' },
  { key: 'financas', label: 'Finanças' },
];

const fmt = (d: string | null) => (d ? format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—');

function AppBadges({ a }: { a: PersonalAccount }) {
  const items = [
    a.usa_rotina && { label: 'Rotina', premium: a.rotina_premium },
    a.usa_fitness && { label: 'Fitness', premium: a.fitness_premium },
    a.usa_financas && { label: 'Finanças', premium: a.financas_premium },
  ].filter(Boolean) as { label: string; premium: boolean }[];
  if (!items.length) return <span className="text-xs text-muted-foreground">Ainda não abriu nenhum app</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(i => (
        <Badge key={i.label} variant={i.premium ? 'default' : 'secondary'}>{i.label}{i.premium ? ' · Premium' : ''}</Badge>
      ))}
    </div>
  );
}

/** Super Admin vê todas as contas do Invex Rotina, Fitness e Finanças (sem ver os dados de dentro dos apps). */
export default function ContasApps() {
  const [rows, setRows] = useState<PersonalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [q, setQ] = useState('');
  const [app, setApp] = useState<AppFilter>('todos');

  const load = async () => {
    setLoading(true); setErro(false);
    const { data, error } = await supabase.rpc('admin_personal_accounts');
    if (error) setErro(true); else setRows((data as PersonalAccount[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const list = useMemo(() => filterPersonalAccounts(rows, app, q), [rows, app, q]);
  const count = (k: AppFilter) => filterPersonalAccounts(rows, k, '').length;

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
            Aqui aparecem só os dados da conta. Lançamentos, treinos e tarefas de cada pessoa continuam privados. Para liberar Premium manualmente, use "Invex Rotina | Acessos".
          </p>

          {loading ? (
            <div className="py-10 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : erro ? (
            <p className="py-8 text-center text-destructive">Não foi possível carregar as contas.</p>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhuma conta encontrada.</p>
          ) : (
            <div className="divide-y divide-border rounded-md border border-border">
              {list.map(a => (
                <div key={a.user_id} className="grid gap-2 p-3 md:grid-cols-[1.4fr_1.2fr_1fr] md:items-center">
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
