import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, RefreshCw, Search, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MODULES_CATALOG } from '@/config/modules';

/**
 * Usuário × Módulos (SuperAdmin).
 *
 * Permite ativar/desativar módulos individualmente para cada usuário
 * de uma empresa, usando a tabela `user_module_permissions`.
 * Não altera o perfil (papel) do usuário — apenas sobrepõe o acesso a módulos.
 */

interface Company { id: string; name: string }
interface UserRow {
  user_id: string;
  nome: string;
  email: string;
  role: string;
}

const GestaoUsuariosModulos = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string>('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [companyModules, setCompanyModules] = useState<Record<string, boolean>>({});
  const [userPerms, setUserPerms] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('companies').select('id, name').order('name').then(({ data }) => {
      const list = (data as Company[]) || [];
      setCompanies(list);
      if (list.length > 0) setCompanyId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      setLoading(true);
      setSelectedUserId('');
      setUserPerms({});

      const [rolesRes, profilesRes, modsRes] = await Promise.all([
        supabase.from('user_roles').select('user_id, role').eq('company_id', companyId),
        supabase.from('profiles').select('user_id, nome, email, company_id').eq('company_id', companyId),
        supabase.from('company_modules').select('module_key, is_active').eq('company_id', companyId),
      ]);

      const roleByUser = new Map<string, string>();
      (rolesRes.data || []).forEach((r: any) => roleByUser.set(r.user_id, r.role));

      const rows: UserRow[] = (profilesRes.data || [])
        .filter((p: any) => roleByUser.has(p.user_id))
        .map((p: any) => ({
          user_id: p.user_id,
          nome: p.nome || p.email,
          email: p.email,
          role: roleByUser.get(p.user_id) || '',
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome));

      setUsers(rows);

      const cmods: Record<string, boolean> = {};
      (modsRes.data || []).forEach((m: any) => { cmods[m.module_key] = m.is_active; });
      setCompanyModules(cmods);

      setLoading(false);
    };
    load();
  }, [companyId]);

  useEffect(() => {
    if (!selectedUserId || !companyId) {
      setUserPerms({});
      return;
    }
    supabase
      .from('user_module_permissions')
      .select('module_key, is_active')
      .eq('company_id', companyId)
      .eq('user_id', selectedUserId)
      .then(({ data }) => {
        const map: Record<string, boolean> = {};
        (data || []).forEach((r: any) => { map[r.module_key] = r.is_active; });
        setUserPerms(map);
      });
  }, [selectedUserId, companyId]);

  const filteredUsers = useMemo(
    () => users.filter(
      (u) =>
        u.nome.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()),
    ),
    [users, search],
  );

  const modules = useMemo(() => MODULES_CATALOG.filter((m) => !m.core), []);

  const toggle = async (moduleKey: string, next: boolean) => {
    if (!companyId || !selectedUserId) return;
    setUserPerms((prev) => ({ ...prev, [moduleKey]: next }));
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_module_permissions')
        .upsert(
          { company_id: companyId, user_id: selectedUserId, module_key: moduleKey, is_active: next },
          { onConflict: 'company_id,user_id,module_key' },
        );
      if (error) throw error;
    } catch (e: any) {
      setUserPerms((prev) => ({ ...prev, [moduleKey]: !next }));
      toast({ title: 'Erro ao salvar', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const bulkSet = async (value: boolean) => {
    if (!companyId || !selectedUserId) return;
    setSaving(true);
    try {
      const rows = modules.map((m) => ({
        company_id: companyId,
        user_id: selectedUserId,
        module_key: m.key,
        is_active: value,
      }));
      const { error } = await supabase
        .from('user_module_permissions')
        .upsert(rows, { onConflict: 'company_id,user_id,module_key' });
      if (error) throw error;
      const next: Record<string, boolean> = {};
      rows.forEach((r) => { next[r.module_key] = value; });
      setUserPerms(next);
      toast({ title: value ? 'Todos os módulos liberados' : 'Todos os módulos bloqueados' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const selectedUser = users.find((u) => u.user_id === selectedUserId);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuários × Módulos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              Sobreponha o acesso a módulos por usuário individualmente. Esta configuração se soma ao perfil (papel)
              — se o módulo estiver desativado aqui, o usuário perde acesso mesmo que o perfil permita.
              Módulos desligados na empresa aparecem em cinza.
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Buscar usuário</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome ou e-mail..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Carregando...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[280px_1fr]">
            {/* Users list */}
            <Card className="max-h-[70vh] overflow-y-auto">
              <CardContent className="p-2">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.user_id}
                        onClick={() => setSelectedUserId(u.user_id)}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                          selectedUserId === u.user_id
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted border border-transparent'
                        }`}
                      >
                        <div className="text-sm font-medium truncate">{u.nome}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{u.role}</div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Modules for selected user */}
            <Card>
              {!selectedUser ? (
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                  Selecione um usuário para gerenciar seus módulos.
                </CardContent>
              ) : (
                <>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{selectedUser.nome}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedUser.email} · Perfil: <Badge variant="outline" className="ml-1">{selectedUser.role}</Badge>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={saving} onClick={() => bulkSet(true)}>
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Liberar tudo
                        </Button>
                        <Button variant="outline" size="sm" disabled={saving} onClick={() => bulkSet(false)}>
                          <XCircle className="w-4 h-4 mr-1" /> Bloquear tudo
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {modules.map((m) => {
                        const companyOn = companyModules[m.key] ?? true;
                        const checked = userPerms[m.key] ?? true;
                        return (
                          <div
                            key={m.key}
                            className={`flex items-start justify-between gap-3 rounded-lg border p-3 transition ${
                              checked ? 'bg-primary/5 border-primary/30' : 'bg-background'
                            } ${!companyOn ? 'opacity-50' : ''}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{m.label}</span>
                                {!companyOn && (
                                  <Badge variant="outline" className="text-[10px] py-0">
                                    Módulo desligado
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {m.description}
                              </p>
                            </div>
                            <Switch
                              checked={checked}
                              disabled={saving || !companyOn}
                              onCheckedChange={(c) => toggle(m.key, c)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default GestaoUsuariosModulos;
