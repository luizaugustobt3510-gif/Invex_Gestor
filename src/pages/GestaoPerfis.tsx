import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Shield, RefreshCw } from 'lucide-react';
import { MODULES_CATALOG } from '@/config/modules';

/**
 * Matriz Perfil × Módulo (por empresa).
 * O nome do perfil não implica mais em módulos: a matriz decide.
 * Padrão: se não houver linha, o perfil tem acesso (compatibilidade).
 * super_admin e admin_empresa ignoram a matriz (sempre têm acesso).
 */

type DbRole =
  | 'super_admin' | 'admin_empresa' | 'usuario_almox' | 'solicitante'
  | 'logistica' | 'rh' | 'financeiro' | 'visualizador' | 'manutencao'
  | 'fitness_user' | 'clinica';

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
};

// Perfis gerenciáveis pela matriz (super_admin e admin_empresa sempre têm acesso total)
const MANAGEABLE_ROLES: DbRole[] = [
  'usuario_almox', 'solicitante', 'logistica', 'rh', 'financeiro',
  'visualizador', 'manutencao', 'fitness_user', 'clinica',
];

interface Company { id: string; nome: string }
interface Row { role: DbRole; module_key: string; is_active: boolean }

const GestaoPerfis = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string>('');
  const [matrix, setMatrix] = useState<Record<string, boolean>>({}); // key: `${role}::${module}`
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = user?.role === 'superadm';

  useEffect(() => {
    const bootstrap = async () => {
      if (isSuperAdmin) {
        const { data } = await supabase.from('companies').select('id, nome').order('nome');
        setCompanies(data || []);
        if (data && data.length > 0) setCompanyId(data[0].id);
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
      const { data } = await supabase
        .from('role_module_permissions')
        .select('role, module_key, is_active')
        .eq('company_id', companyId);

      const map: Record<string, boolean> = {};
      (data as Row[] | null || []).forEach((r) => {
        map[`${r.role}::${r.module_key}`] = r.is_active;
      });
      setMatrix(map);
      setLoading(false);
    };
    load();
  }, [companyId]);

  const toggle = async (role: DbRole, moduleKey: string, next: boolean) => {
    if (!companyId) return;
    const key = `${role}::${moduleKey}`;
    setMatrix((prev) => ({ ...prev, [key]: next }));
    setSaving(true);
    try {
      const { error } = await supabase
        .from('role_module_permissions')
        .upsert(
          { company_id: companyId, role: role as any, module_key: moduleKey, is_active: next },
          { onConflict: 'company_id,role,module_key' },
        );
      if (error) throw error;
    } catch (e: any) {
      setMatrix((prev) => ({ ...prev, [key]: !next }));
      toast({ title: 'Erro ao atualizar permissão', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const modules = MODULES_CATALOG.filter((m) => !m.core);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Gestão de Perfis (Perfil × Módulo)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p>• Marque quais módulos cada perfil pode acessar dentro desta empresa.</p>
              <p>• <strong>Administrador</strong> e <strong>Super Admin</strong> têm acesso total automaticamente e não aparecem aqui.</p>
              <p>• Desmarcar um módulo apenas oculta as funcionalidades para os usuários daquele perfil — nenhum dado é apagado.</p>
              <p>• Se o módulo estiver desativado em "Módulos da Empresa", ninguém enxerga, independentemente da matriz.</p>
            </div>

            {isSuperAdmin && (
              <div className="max-w-sm space-y-2">
                <Label>Empresa</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Carregando matriz...
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Perfil</th>
                      {modules.map((m) => (
                        <th key={m.key} className="text-center p-3 font-medium whitespace-nowrap">
                          {m.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MANAGEABLE_ROLES.map((role) => (
                      <tr key={role} className="border-t">
                        <td className="p-3 font-medium">{ROLE_LABELS[role]}</td>
                        {modules.map((m) => {
                          const key = `${role}::${m.key}`;
                          const checked = matrix[key] ?? true;
                          return (
                            <td key={m.key} className="p-3 text-center">
                              <Switch
                                checked={checked}
                                disabled={saving}
                                onCheckedChange={(c) => toggle(role, m.key, c)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default GestaoPerfis;
