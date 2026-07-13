import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, RefreshCw, Search, CheckCircle2, XCircle, Users } from 'lucide-react';
import { MODULES_CATALOG } from '@/config/modules';

/**
 * Nova UX de Gestão de Perfis × Módulos.
 * Em vez de uma matriz gigante, o admin escolhe UM perfil e vê seus módulos
 * como cartões com switch individual, busca e ações em massa.
 */

type DbRole =
  | 'super_admin' | 'admin_empresa' | 'usuario_almox' | 'solicitante'
  | 'logistica' | 'rh' | 'financeiro' | 'visualizador' | 'manutencao'
  | 'fitness_user' | 'clinica' | 'enfermagem' | 'enfermeiro' | 'recepcionista';

const ROLE_LABELS: Record<DbRole, string> = {
  super_admin: 'Super Admin',
  admin_empresa: 'Administrador',
  usuario_almox: 'Usuário Almoxarifado',
  solicitante: 'Solicitante',
  logistica: 'Logística',
  rh: 'Gestão de Pessoas',
  financeiro: 'Financeiro',
  visualizador: 'Visualizador',
  manutencao: 'Manutenção',
  fitness_user: 'Fitness',
  clinica: 'Clínica',
  enfermagem: 'Enfermagem',
  enfermeiro: 'Enfermeiro',
  recepcionista: 'Recepcionista',
};

const ROLE_DESCRIPTIONS: Record<DbRole, string> = {
  super_admin: 'Acesso total ao sistema (não gerenciável aqui).',
  admin_empresa: 'Administrador da empresa (não gerenciável aqui).',
  usuario_almox: 'Operação de almoxarifado e estoque.',
  solicitante: 'Solicita materiais e acompanha pedidos.',
  logistica: 'Gestão logística e compras.',
  rh: 'Gestão de Pessoas: colaboradores, férias, ASO.',
  financeiro: 'Lançamentos, fluxo de caixa e relatórios.',
  visualizador: 'Acesso apenas de leitura.',
  manutencao: 'Manutenção e ordens de serviço.',
  fitness_user: 'Usuário do módulo Fitness.',
  clinica: 'Prontuário, agenda e atendimentos clínicos.',
  enfermagem: 'Equipe de enfermagem — apoio clínico e prontuário.',
  enfermeiro: 'Enfermeiro responsável — prontuário, anamnese e agenda.',
  recepcionista: 'Recepção — agenda, cadastro de pacientes e atendimento.',
};

const MANAGEABLE_ROLES: DbRole[] = [
  'usuario_almox', 'solicitante', 'logistica', 'rh', 'financeiro',
  'visualizador', 'manutencao', 'fitness_user', 'clinica',
  'enfermagem', 'enfermeiro', 'recepcionista',
];

interface Company { id: string; name: string }
interface Row { role: DbRole; module_key: string; is_active: boolean }

const GestaoPerfis = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string>('');
  const [companyModules, setCompanyModules] = useState<Record<string, boolean>>({});
  const [matrix, setMatrix] = useState<Record<string, boolean>>({}); // `${role}::${module}`
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [selectedRole, setSelectedRole] = useState<DbRole>('usuario_almox');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = user?.role === 'superadm';

  useEffect(() => {
    const bootstrap = async () => {
      if (isSuperAdmin) {
        const { data } = await supabase.from('companies').select('id, name').order('name');
        setCompanies((data as Company[]) || []);
        if (data && data.length > 0) setCompanyId((data[0] as Company).id);
      } else if (user?.companyId) {
        setCompanyId(user.companyId);
      }
    };
    bootstrap();
  }, [isSuperAdmin, user?.companyId]);

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      setLoading(true);
      const [permRes, modsRes, rolesRes] = await Promise.all([
        supabase.from('role_module_permissions').select('role, module_key, is_active').eq('company_id', companyId),
        supabase.from('company_modules').select('module_key, is_active').eq('company_id', companyId),
        supabase.from('user_roles').select('role').eq('company_id', companyId),
      ]);

      const map: Record<string, boolean> = {};
      (permRes.data as Row[] | null || []).forEach((r) => {
        map[`${r.role}::${r.module_key}`] = r.is_active;
      });
      setMatrix(map);

      const cmods: Record<string, boolean> = {};
      (modsRes.data || []).forEach((m: any) => { cmods[m.module_key] = m.is_active; });
      setCompanyModules(cmods);

      const counts: Record<string, number> = {};
      (rolesRes.data || []).forEach((r: any) => {
        counts[r.role] = (counts[r.role] || 0) + 1;
      });
      setUserCounts(counts);

      setLoading(false);
    };
    load();
  }, [companyId]);

  const modules = useMemo(
    () => MODULES_CATALOG.filter((m) => !m.core).filter(
      (m) => m.label.toLowerCase().includes(search.toLowerCase()) ||
             m.description.toLowerCase().includes(search.toLowerCase()),
    ),
    [search],
  );

  const toggle = async (moduleKey: string, next: boolean) => {
    if (!companyId) return;
    const key = `${selectedRole}::${moduleKey}`;
    setMatrix((prev) => ({ ...prev, [key]: next }));
    setSaving(true);
    try {
      const { error } = await supabase
        .from('role_module_permissions')
        .upsert(
          { company_id: companyId, role: selectedRole as any, module_key: moduleKey, is_active: next },
          { onConflict: 'company_id,role,module_key' },
        );
      if (error) throw error;
    } catch (e: any) {
      setMatrix((prev) => ({ ...prev, [key]: !next }));
      toast({ title: 'Erro ao atualizar', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const bulkSet = async (value: boolean) => {
    if (!companyId) return;
    setSaving(true);
    const rows = MODULES_CATALOG.filter((m) => !m.core).map((m) => ({
      company_id: companyId,
      role: selectedRole as any,
      module_key: m.key,
      is_active: value,
    }));
    try {
      const { error } = await supabase
        .from('role_module_permissions')
        .upsert(rows, { onConflict: 'company_id,role,module_key' });
      if (error) throw error;
      const next = { ...matrix };
      rows.forEach((r) => { next[`${r.role}::${r.module_key}`] = value; });
      setMatrix(next);
      toast({ title: value ? 'Todos os módulos liberados' : 'Todos os módulos bloqueados' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const activeCount = modules.filter((m) => (matrix[`${selectedRole}::${m.key}`] ?? true)).length;

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Gestão de Perfis × Módulos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              Escolha o perfil e libere/bloqueie os módulos que ele pode acessar nesta empresa.
              Administrador e Super Admin sempre têm acesso total.
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {isSuperAdmin && (
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
              )}
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as DbRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MANAGEABLE_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                        {userCounts[r] ? ` (${userCounts[r]} usuário${userCounts[r] > 1 ? 's' : ''})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Carregando...
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{ROLE_LABELS[selectedRole]}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{ROLE_DESCRIPTIONS[selectedRole]}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Users className="w-3 h-3" />
                    {userCounts[selectedRole] || 0} usuários
                  </Badge>
                  <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/20">
                    {activeCount}/{modules.length} liberados
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar módulo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" disabled={saving} onClick={() => bulkSet(true)}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Liberar tudo
                </Button>
                <Button variant="outline" size="sm" disabled={saving} onClick={() => bulkSet(false)}>
                  <XCircle className="w-4 h-4 mr-1" /> Bloquear tudo
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {modules.map((m) => {
                  const key = `${selectedRole}::${m.key}`;
                  const checked = matrix[key] ?? true;
                  const companyOn = companyModules[m.key] ?? true;
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
                {modules.length === 0 && (
                  <div className="col-span-full text-center py-8 text-sm text-muted-foreground">
                    Nenhum módulo encontrado.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default GestaoPerfis;
