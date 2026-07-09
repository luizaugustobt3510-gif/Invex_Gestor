import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, MoreVertical, UserPlus, Save, Shield, Building, Puzzle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserRow {
  user_id: string;
  nome: string;
  email: string;
  role: string;
  company_id: string | null;
  company_name?: string;
  created_at: string;
  sexo?: string | null;
  data_nascimento?: string | null;
  telefone?: string | null;
  cargo?: string | null;
}

interface Company {
  id: string;
  name: string;
}

const roleLabels: Record<string, string> = {
  super_admin: 'SuperAdmin',
  admin_empresa: 'Admin Empresa',
  rh: 'RH',
  logistica: 'Logística',
  financeiro: 'Financeiro',
  usuario_almox: 'Almoxarifado',
  solicitante: 'Solicitante',
  visualizador: 'Convidado',
  fitness_user: 'Invex Fitness',
};

const USER_PERMISSIONS_BY_ROLE: Record<string, { key: string; label: string }[]> = {
  logistica: [
    { key: 'estoque', label: 'Estoque (Dashboard)' },
    { key: 'conferencia', label: 'Conferência de Temperatura' },
    { key: 'recontagem', label: 'Recontagem' },
    { key: 'ordens_compra', label: 'Ordens de Compra' },
    { key: 'importacao_materiais', label: 'Importação de Materiais' },
    { key: 'importacao_saldo', label: 'Importação de Saldo' },
    { key: 'conciliacao', label: 'Conciliação' },
    { key: 'solicitacoes', label: 'Solicitações' },
  ],
  rh: [
    { key: 'colaboradores', label: 'Colaboradores' },
    { key: 'ferias', label: 'Férias' },
    { key: 'atestados', label: 'Atestados' },
    { key: 'treinamentos', label: 'Treinamentos' },
    { key: 'aso', label: 'ASO' },
    { key: 'avaliacoes', label: 'Avaliações' },
    { key: 'banco_horas', label: 'Banco de Horas' },
    { key: 'indicadores', label: 'Indicadores' },
  ],
  financeiro: [
    { key: 'dashboard_financeiro', label: 'Dashboard Financeiro' },
    { key: 'relatorios_financeiros', label: 'Relatórios Financeiros' },
  ],
};

// For company-level module dialog (kept for backward compat)
const ALL_MODULES = [
  { key: 'logistica', label: 'Logística' },
  { key: 'rh_module', label: 'RH' },
  { key: 'financeiro_module', label: 'Financeiro' },
  { key: 'compras', label: 'Compras' },
  { key: 'relatorios', label: 'Relatórios' },
];

// Modules that can be GRANTED to a user (full CRUD) regardless of role
const GRANTABLE_MODULES = [
  { key: 'logistica', label: 'Logística & Estoque' },
  { key: 'rh', label: 'Gestão de Pessoas' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'manutencao', label: 'Manutenção' },
  { key: 'academia', label: 'Academia' },
  { key: 'vendas', label: 'Vendas' },
];

const GestaoUsuarios = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editCompanyId, setEditCompanyId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNome, setEditNome] = useState('');
  const [editSexo, setEditSexo] = useState('');
  const [editNascimento, setEditNascimento] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editCargo, setEditCargo] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', senha: '', nome: '', role: '', company_id: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [rolesRes, profilesRes, companiesRes] = await Promise.all([
        supabase.from('user_roles').select('user_id, role, company_id, created_at'),
        supabase.from('profiles').select('user_id, nome, email, company_id'),
        supabase.from('companies').select('id, name').order('name'),
      ]);

      setCompanies(companiesRes.data || []);
      const compMap = new Map((companiesRes.data || []).map(c => [c.id, c.name]));
      const profMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));

      const merged: UserRow[] = (rolesRes.data || []).map(r => {
        const prof = profMap.get(r.user_id);
        return {
          user_id: r.user_id,
          nome: prof?.nome || 'Sem nome',
          email: prof?.email || '',
          role: r.role,
          company_id: r.company_id,
          company_name: r.company_id ? compMap.get(r.company_id) || '' : 'Global',
          created_at: r.created_at,
        };
      });

      setUsers(merged);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editUser || !editRole) return;
    try {
      const updates: any = { role: editRole };
      if (editCompanyId) updates.company_id = editCompanyId;

      const { error } = await supabase
        .from('user_roles')
        .update(updates)
        .eq('user_id', editUser.user_id);
      if (error) throw error;

      // Update profile company_id too
      if (editCompanyId) {
        await supabase.from('profiles').update({ company_id: editCompanyId }).eq('user_id', editUser.user_id);
      }

      // Audit log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_log').insert({
          user_id: user.id,
          action: 'update_user',
          entity_type: 'user',
          entity_id: editUser.user_id,
          details: { old_role: editUser.role, new_role: editRole, company_id: editCompanyId, target_email: editUser.email },
        });
      }

      toast({ title: 'Usuário atualizado com sucesso!' });
      setEditOpen(false);
      loadData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (u: UserRow) => {
    if (!confirm(`Tem certeza que deseja deletar o usuário ${u.nome}? Isso removerá completamente o cadastro e o e-mail de autenticação.`)) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Sessão expirada');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ action: 'delete_user', user_id: u.user_id }),
        }
      );
      const result = await response.json();

      if (result.ok) {
        // Audit log
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('audit_log').insert({
            user_id: user.id,
            action: 'delete_user',
            entity_type: 'user',
            entity_id: u.user_id,
            details: { email: u.email, nome: u.nome },
          });
        }
        toast({ title: 'Usuário deletado completamente.' });
        loadData();
      } else {
        toast({ title: 'Erro', description: result.error || 'Erro ao deletar.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const openModulesDialog = async (u: UserRow) => {
    setModulesUser(u);
    // Load company modules for user's company
    if (u.company_id) {
      const [companyRes, extraRes] = await Promise.all([
        supabase.from('company_modules').select('module_key, is_active').eq('company_id', u.company_id),
        supabase.from('user_module_permissions').select('module_key, is_active').eq('company_id', u.company_id).eq('user_id', u.user_id),
      ]);
      const state: Record<string, boolean> = {};
      ALL_MODULES.forEach(m => { state[m.key] = true; });
      (companyRes.data || []).forEach(d => { state[d.module_key] = d.is_active; });
      setUserModules(state);

      const extras: Record<string, boolean> = {};
      (extraRes.data || []).forEach(d => { extras[d.module_key] = d.is_active; });
      setExtraModules(extras);
    } else {
      const state: Record<string, boolean> = {};
      ALL_MODULES.forEach(m => { state[m.key] = true; });
      setUserModules(state);
      setExtraModules({});
    }
    setModulesOpen(true);
  };

  const toggleExtraModule = async (moduleKey: string, active: boolean) => {
    if (!modulesUser?.company_id) return;
    setExtraModules(prev => ({ ...prev, [moduleKey]: active }));
    try {
      const { error } = await supabase
        .from('user_module_permissions')
        .upsert(
          { user_id: modulesUser.user_id, company_id: modulesUser.company_id, module_key: moduleKey, is_active: active },
          { onConflict: 'user_id,company_id,module_key' }
        );
      if (error) throw error;
      toast({ title: active ? 'Módulo concedido' : 'Módulo revogado', description: 'Atualizado com sucesso.' });
    } catch (e: any) {
      setExtraModules(prev => ({ ...prev, [moduleKey]: !active }));
      toast({ title: 'Erro', description: e.message || 'Não foi possível atualizar.', variant: 'destructive' });
    }
  };

  const toggleModule = async (moduleKey: string, active: boolean) => {
    if (!modulesUser?.company_id) return;
    setUserModules(prev => ({ ...prev, [moduleKey]: active }));
    try {
      const { error } = await supabase
        .from('company_modules')
        .upsert(
          { company_id: modulesUser.company_id, module_key: moduleKey, is_active: active },
          { onConflict: 'company_id,module_key' }
        );
      if (error) throw error;
      toast({ title: active ? 'Módulo ativado' : 'Módulo desativado' });
    } catch {
      setUserModules(prev => ({ ...prev, [moduleKey]: !active }));
      toast({ title: 'Erro ao atualizar módulo', variant: 'destructive' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, senha, nome, role, company_id } = formData;
    if (!email || !senha || !nome || !role) {
      toast({ title: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }

    setCreateLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Sessão expirada');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password: senha.trim(),
            nome: nome.trim(),
            role,
            company_id: company_id || undefined,
          }),
        }
      );
      const result = await response.json();

      if (result.ok || result.success) {
        toast({ title: 'Usuário criado com sucesso!' });
        setFormData({ email: '', senha: '', nome: '', role: '', company_id: '' });
        setCreateOpen(false);
        loadData();
      } else {
        toast({ title: 'Erro', description: result.error || result.msg, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setCreateLoading(false);
    }
  };

  const filtered = users.filter(u =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Gestão de Usuários
          </h1>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="w-4 h-4" /> Novo Usuário</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Usuário</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label>Senha *</Label>
                  <Input type="password" value={formData.senha} onChange={e => setFormData(p => ({ ...p, senha: e.target.value }))} placeholder="Senha" />
                </div>
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Select value={formData.company_id} onValueChange={v => setFormData(p => ({ ...p, company_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Vincular a uma empresa" /></SelectTrigger>
                    <SelectContent>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Perfil *</Label>
                  <Select value={formData.role} onValueChange={v => setFormData(p => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar perfil" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={createLoading}>
                  <Save className="w-4 h-4" /> {createLoading ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Badge variant="secondary">{filtered.length} usuários</Badge>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(u => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium">{u.nome}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-muted-foreground" />
                            {u.company_name || '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {roleLabels[u.role] || u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setEditUser(u);
                                setEditRole(u.role);
                                setEditCompanyId(u.company_id || '');
                                setEditOpen(true);
                              }}>
                                Editar perfil / empresa
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openModulesDialog(u)}>
                                <Puzzle className="w-4 h-4 mr-2" /> Módulos de acesso
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteUser(u)}
                              >
                                Deletar usuário
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum usuário encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Usuário — {editUser?.nome}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{editUser?.email}</p>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={editCompanyId} onValueChange={setEditCompanyId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar empresa" /></SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleEditSave} className="w-full">Salvar Alterações</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Permissions Dialog */}
        <Dialog open={modulesOpen} onOpenChange={setModulesOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Puzzle className="w-5 h-5" /> Permissões — {modulesUser?.nome}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-1">
              {!modulesUser?.company_id ? (
                <p className="text-sm text-muted-foreground">Usuário sem empresa vinculada. Vincule primeiro.</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Perfil: <Badge variant="outline">{roleLabels[modulesUser.role] || modulesUser.role}</Badge>
                    — Ative ou desative funções específicas para este usuário.
                  </p>
                  {(() => {
                    const roleKey = modulesUser.role === 'usuario_almox' ? 'logistica' : modulesUser.role;
                    const perms = USER_PERMISSIONS_BY_ROLE[roleKey];
                    if (!perms || perms.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          Este perfil não possui permissões granulares configuráveis.
                        </p>
                      );
                    }
                    return perms.map(mod => (
                      <div key={mod.key} className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm font-medium">{mod.label}</span>
                        <Switch
                          checked={userModules[mod.key] ?? true}
                          onCheckedChange={(checked) => toggleModule(mod.key, checked)}
                        />
                      </div>
                    ));
                  })()}

                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-2">Módulos extras concedidos</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Conceda acesso completo (ler/criar/editar/excluir) a outros módulos além do perfil principal deste usuário.
                    </p>
                    <div className="space-y-2">
                      {GRANTABLE_MODULES.map(mod => (
                        <div key={mod.key} className="flex items-center justify-between rounded-lg border p-3">
                          <span className="text-sm font-medium">{mod.label}</span>
                          <Switch
                            checked={extraModules[mod.key] ?? false}
                            onCheckedChange={(checked) => toggleExtraModule(mod.key, checked)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default GestaoUsuarios;
