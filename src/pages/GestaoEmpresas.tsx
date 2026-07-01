import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building, Edit, RefreshCw, Plus, Users, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COMPANY_TYPES, COMPANY_TYPE_LABELS, COMPANY_TYPE_TEMPLATES, type CompanyType } from '@/config/companyTypeTemplates';
import { MODULES_CATALOG } from '@/config/modules';
import { Checkbox } from '@/components/ui/checkbox';

interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  status: string;
  created_at: string;
  company_type?: CompanyType;
  user_count?: number;
}

const GestaoEmpresas = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [newDialog, setNewDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newType, setNewType] = useState<CompanyType>('personalizado');
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<Company | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data: companiesData } = await supabase.from('companies').select('*').order('name');
    const { data: roles } = await supabase.from('user_roles').select('company_id');

    const countMap: Record<string, number> = {};
    (roles || []).forEach(r => {
      if (r.company_id) countMap[r.company_id] = (countMap[r.company_id] || 0) + 1;
    });

    setCompanies((companiesData || []).map(c => ({
      ...c,
      status: (c as any).status || 'ativa',
      company_type: ((c as any).company_type as CompanyType) || 'personalizado',
      user_count: countMap[c.id] || 0,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({ name: newName.trim(), cnpj: newCnpj.trim() || null, company_type: newType } as any)
        .select('id')
        .single();
      if (error) throw error;

      // Pre-ativar módulos do template (aditivo, is_active=true)
      const suggested = COMPANY_TYPE_TEMPLATES[newType] || [];
      if (data?.id && suggested.length > 0) {
        await supabase.from('company_modules').upsert(
          suggested.map((key) => ({ company_id: data.id, module_key: key, is_active: true })),
          { onConflict: 'company_id,module_key' },
        );
      }

      toast({ title: 'Empresa criada!', description: suggested.length ? `${suggested.length} módulo(s) do template ativados.` : undefined });
      setNewDialog(false);
      setNewName('');
      setNewCnpj('');
      setNewType('personalizado');
      fetchCompanies();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao criar empresa.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editCompany) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('companies')
        .update({
          name: editCompany.name,
          cnpj: editCompany.cnpj,
          status: editCompany.status,
          company_type: editCompany.company_type || 'personalizado',
        } as any)
        .eq('id', editCompany.id);
      if (error) throw error;
      toast({ title: 'Empresa atualizada!' });
      setEditCompany(null);
      fetchCompanies();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao atualizar empresa.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (company: Company) => {
    const newStatus = company.status === 'ativa' ? 'inativa' : 'ativa';
    try {
      await supabase.from('companies').update({ status: newStatus }).eq('id', company.id);
      toast({ title: `Empresa ${newStatus === 'ativa' ? 'ativada' : 'desativada'}` });
      fetchCompanies();
    } catch {
      toast({ title: 'Erro', variant: 'destructive' });
    }
  };

  const handleDeleteCompany = async () => {
    if (!deleteDialog || deleteConfirmText !== deleteDialog.name) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-company', {
        body: { company_id: deleteDialog.id },
      });
      if (error) throw error;
      toast({ title: 'Empresa excluída', description: data?.message || 'Empresa e todos os dados foram removidos.' });
      setDeleteDialog(null);
      setDeleteConfirmText('');
      fetchCompanies();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Erro ao excluir empresa.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <MainLayout>
      <Card className="max-w-5xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Gestão de Empresas
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setNewDialog(true)} className="gap-1">
              <Plus className="w-4 h-4" /> Nova Empresa
            </Button>
            <Button variant="outline" size="sm" onClick={fetchCompanies} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Usuários</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono text-sm">{c.cnpj || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{COMPANY_TYPE_LABELS[c.company_type || 'personalizado']}</Badge></TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          {c.user_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={c.status === 'ativa' ? 'default' : 'destructive'}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(c.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditCompany({ ...c })}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleStatus(c)}>
                            {c.status === 'ativa' ? (
                              <ShieldOff className="w-4 h-4 text-destructive" />
                            ) : (
                              <ShieldCheck className="w-4 h-4 text-primary" />
                            )}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteDialog(c)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Company Dialog */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Empresa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome da empresa" />
            </div>
            <div className="space-y-2">
              <Label>CNPJ (opcional)</Label>
              <Input value={newCnpj} onChange={e => setNewCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Empresa</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as CompanyType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPES.map(t => <SelectItem key={t} value={t}>{COMPANY_TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define os módulos sugeridos inicialmente. Poderá ser alterado depois.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !newName.trim()}>
              {saving ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={!!editCompany} onOpenChange={open => { if (!open) setEditCompany(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Empresa</DialogTitle></DialogHeader>
          {editCompany && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editCompany.name} onChange={e => setEditCompany({ ...editCompany, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={editCompany.cnpj || ''} onChange={e => setEditCompany({ ...editCompany, cnpj: e.target.value || null })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Empresa</Label>
                <Select
                  value={editCompany.company_type || 'personalizado'}
                  onValueChange={(v) => setEditCompany({ ...editCompany, company_type: v as CompanyType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPANY_TYPES.map(t => <SelectItem key={t} value={t}>{COMPANY_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCompany(null)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Company Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={open => { if (!open) { setDeleteDialog(null); setDeleteConfirmText(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Excluir Empresa
            </DialogTitle>
            <DialogDescription>
              <strong>Esta ação é irreversível!</strong> A empresa <strong>"{deleteDialog?.name}"</strong> e TODOS os seus dados serão permanentemente removidos:
              <br /><br />
              • Materiais, estoques e movimentações<br />
              • Ordens de compra e solicitações<br />
              • Setores e conferências<br />
              • Alunos e mensalidades (Academia)<br />
              • Vendas e lançamentos financeiros<br />
              • Colaboradores e dados de RH<br />
              • Usuários vinculados à empresa<br />
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Digite o nome da empresa <strong>"{deleteDialog?.name}"</strong> para confirmar:</Label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={deleteDialog?.name || ''}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialog(null); setDeleteConfirmText(''); }}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCompany}
              disabled={deleteConfirmText !== deleteDialog?.name || deleting}
            >
              {deleting ? 'Excluindo...' : 'Excluir Permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default GestaoEmpresas;
