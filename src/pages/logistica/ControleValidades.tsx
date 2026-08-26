import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CalendarClock, AlertTriangle, XCircle, CheckCircle, Layers, Plus, Pencil, Trash2, Edit } from 'lucide-react';
import { useInventoryData, InventoryItem } from '@/hooks/useInventoryData';
import { useMaterialGroups } from '@/hooks/useMaterialGroups';
import { getValidadeInfo, formatValidade, ValidadeStatus } from '@/lib/validade';
import { EditMaterialDialog } from '@/components/EditMaterialDialog';
import { toast } from 'sonner';

const statusBadge = (s: ValidadeStatus) => {
  switch (s) {
    case 'vencido': return { variant: 'destructive' as const, label: 'Vencido' };
    case 'critico': return { variant: 'destructive' as const, label: 'Vence em 30 dias' };
    case 'atencao': return { variant: 'warning' as const, label: 'Vence em 90 dias' };
    case 'ok': return { variant: 'default' as const, label: 'Em dia' };
    default: return { variant: 'outline' as const, label: 'Sem validade' };
  }
};

export default function ControleValidades() {
  const { data, loading, refetch } = useInventoryData();
  const { groups, loading: loadingGroups, createGroup, updateGroup, deleteGroup, seedDefaults } = useMaterialGroups();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | ValidadeStatus>('todos');
  const [groupFilter, setGroupFilter] = useState<string>('todos');
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  const [groupDialog, setGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{ id: string; nome: string; descricao: string } | null>(null);
  const [groupForm, setGroupForm] = useState({ nome: '', descricao: '' });
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);

  const enriched = useMemo(
    () => data.map(item => ({ item, info: getValidadeInfo(item.validade) })),
    [data]
  );

  const counts = useMemo(() => ({
    vencido: enriched.filter(e => e.info.status === 'vencido').length,
    critico: enriched.filter(e => e.info.status === 'critico').length,
    atencao: enriched.filter(e => e.info.status === 'atencao').length,
    sem: enriched.filter(e => e.info.status === 'sem_validade').length,
  }), [enriched]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return enriched
      .filter(e => statusFilter === 'todos' ? e.info.status !== 'sem_validade' : e.info.status === statusFilter)
      .filter(e => groupFilter === 'todos' ? true : (e.item.groupId || 'sem') === groupFilter)
      .filter(e => !term || e.item.material.toLowerCase().includes(term) || e.item.codigo.toLowerCase().includes(term))
      .sort((a, b) => (a.info.dias ?? 99999) - (b.info.dias ?? 99999));
  }, [enriched, statusFilter, groupFilter, search]);

  const openNewGroup = () => { setEditingGroup(null); setGroupForm({ nome: '', descricao: '' }); setGroupDialog(true); };
  const openEditGroup = (g: any) => {
    setEditingGroup({ id: g.id, nome: g.nome, descricao: g.descricao || '' });
    setGroupForm({ nome: g.nome, descricao: g.descricao || '' });
    setGroupDialog(true);
  };

  const saveGroup = async () => {
    if (!groupForm.nome.trim()) return toast.error('Informe o nome do grupo');
    const ok = editingGroup
      ? await updateGroup(editingGroup.id, groupForm.nome, groupForm.descricao)
      : !!(await createGroup(groupForm.nome, groupForm.descricao));
    if (ok) { toast.success('Grupo salvo'); setGroupDialog(false); }
  };

  const confirmDeleteGroup = async () => {
    if (!deletingGroup) return;
    const ok = await deleteGroup(deletingGroup);
    if (ok) { toast.success('Grupo excluído'); refetch(); }
    setDeletingGroup(null);
  };

  const countByGroup = (id: string) => data.filter(m => m.groupId === id).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Controle de Validades</h1>
            <p className="text-sm text-muted-foreground">Acompanhe vencimentos e organize os materiais em grupos.</p>
          </div>
        </div>

        <Tabs defaultValue="validades">
          <TabsList>
            <TabsTrigger value="validades">Validades</TabsTrigger>
            <TabsTrigger value="grupos">Grupos de Materiais</TabsTrigger>
          </TabsList>

          <TabsContent value="validades" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {([
                { key: 'vencido', label: 'Vencidos', value: counts.vencido, icon: XCircle, cls: 'text-destructive' },
                { key: 'critico', label: 'Vencem em 30 dias', value: counts.critico, icon: AlertTriangle, cls: 'text-destructive' },
                { key: 'atencao', label: 'Vencem em 90 dias', value: counts.atencao, icon: CalendarClock, cls: 'text-warning' },
                { key: 'sem_validade', label: 'Sem validade', value: counts.sem, icon: CheckCircle, cls: 'text-muted-foreground' },
              ] as const).map(c => (
                <Card
                  key={c.key}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === c.key ? 'border-primary border-2' : ''}`}
                  onClick={() => setStatusFilter(statusFilter === c.key ? 'todos' : (c.key as ValidadeStatus))}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase">{c.label}</span>
                      <c.icon className={`w-4 h-4 ${c.cls}`} />
                    </div>
                    <p className="text-2xl font-bold">{c.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input placeholder="Buscar por código ou material..." value={search} onChange={e => setSearch(e.target.value)} />
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Situação" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Com validade (todos)</SelectItem>
                    <SelectItem value="vencido">Vencidos</SelectItem>
                    <SelectItem value="critico">Vencem em 30 dias</SelectItem>
                    <SelectItem value="atencao">Vencem em 90 dias</SelectItem>
                    <SelectItem value="ok">Em dia</SelectItem>
                    <SelectItem value="sem_validade">Sem validade</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger><SelectValue placeholder="Grupo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os grupos</SelectItem>
                    <SelectItem value="sem">Sem grupo</SelectItem>
                    {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{filtered.length} material(is)</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {loading ? (
                  <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Nenhum material encontrado para este filtro.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Grupo</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead className="text-right">Qtd.</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(({ item, info }) => {
                        const badge = statusBadge(info.status);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.codigo}</TableCell>
                            <TableCell className="max-w-xs truncate">{item.material}</TableCell>
                            <TableCell>{item.groupName || '-'}</TableCell>
                            <TableCell>{formatValidade(item.validade)}</TableCell>
                            <TableCell>
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                              <span className="ml-2 text-xs text-muted-foreground">{info.label}</span>
                            </TableCell>
                            <TableCell className="text-right">{item.quantidade}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => setEditItem(item)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grupos" className="space-y-4 pt-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={openNewGroup} className="gap-2"><Plus className="w-4 h-4" /> Novo grupo</Button>
              <Button variant="outline" onClick={seedDefaults} className="gap-2"><Layers className="w-4 h-4" /> Criar grupos padrão</Button>
            </div>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                {loadingGroups ? (
                  <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Nenhum grupo cadastrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Grupo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Materiais</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups.map(g => (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">{g.nome}</TableCell>
                          <TableCell className="text-muted-foreground">{g.descricao || '-'}</TableCell>
                          <TableCell className="text-right">{countByGroup(g.id)}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditGroup(g)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeletingGroup(g.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <EditMaterialDialog
        item={editItem}
        open={!!editItem}
        onOpenChange={(o) => { if (!o) setEditItem(null); }}
        onSaved={refetch}
      />

      <Dialog open={groupDialog} onOpenChange={setGroupDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingGroup ? 'Editar grupo' : 'Novo grupo'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={groupForm.nome} onChange={e => setGroupForm({ ...groupForm, nome: e.target.value })} placeholder="Ex: Medicamentos" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={groupForm.descricao} onChange={e => setGroupForm({ ...groupForm, descricao: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialog(false)}>Cancelar</Button>
            <Button onClick={saveGroup}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingGroup} onOpenChange={(o) => { if (!o) setDeletingGroup(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Os materiais deste grupo continuarão cadastrados, mas ficarão sem grupo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGroup}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
