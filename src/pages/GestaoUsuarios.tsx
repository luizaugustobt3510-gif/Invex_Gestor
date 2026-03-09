import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, MoreVertical, UserPlus, Save, Shield } from 'lucide-react';
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
};

const GestaoUsuarios = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', senha: '', nome: '', role: '' });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const { data: roles } = await supabase.from('user_roles').select('user_id, role, company_id, created_at');
      const { data: profiles } = await supabase.from('profiles').select('user_id, nome, email, company_id');
      const { data: companies } = await supabase.from('companies').select('id, name');

      const compMap = new Map((companies || []).map(c => [c.id, c.name]));
      const profMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const merged: UserRow[] = (roles || []).map(r => {
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

  const handleEditRole = async () => {
    if (!editUser || !editRole) return;
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: editRole as any })
        .eq('user_id', editUser.user_id);
      if (error) throw error;

      // Audit log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_log').insert({
          user_id: user.id,
          action: 'update_role',
          entity_type: 'user',
          entity_id: editUser.user_id,
          details: { old_role: editUser.role, new_role: editRole, target_email: editUser.email },
        });
      }

      toast({ title: 'Perfil atualizado com sucesso!' });
      setEditOpen(false);
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (u: UserRow) => {
    if (!confirm(`Tem certeza que deseja deletar o usuário ${u.nome}?`)) return;
    try {
      // Delete role, profile will cascade or remain
      await supabase.from('user_roles').delete().eq('user_id', u.user_id);
      await supabase.from('profiles').delete().eq('user_id', u.user_id);

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

      toast({ title: 'Usuário removido.' });
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, senha, nome, role } = formData;
    if (!email || !senha || !nome || !role) {
      toast({ title: 'Preencha todos os campos.', variant: 'destructive' });
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
          body: JSON.stringify({ email: email.trim().toLowerCase(), password: senha.trim(), nome: nome.trim(), role }),
        }
      );
      const result = await response.json();

      if (result.ok || result.success) {
        toast({ title: 'Usuário criado com sucesso!' });
        setFormData({ email: '', senha: '', nome: '', role: '' });
        setCreateOpen(false);
        loadUsers();
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
                        <TableCell className="text-sm">{u.company_name || '—'}</TableCell>
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
                                setEditOpen(true);
                              }}>
                                Alterar perfil
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

        {/* Edit Role Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Alterar Perfil — {editUser?.nome}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{editUser?.email}</p>
              <div className="space-y-2">
                <Label>Novo Perfil</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleEditRole} className="w-full">Salvar Alteração</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default GestaoUsuarios;
