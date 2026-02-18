import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Save, RefreshCw, Trash2 } from 'lucide-react';

interface Setor {
  id: string;
  nome: string;
  descricao: string | null;
}

const CriarSetor = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingSetores, setLoadingSetores] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [setores, setSetores] = useState<Setor[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const getCompanyId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('user_roles')
      .select('company_id')
      .eq('user_id', user.id)
      .not('company_id', 'is', null)
      .limit(1)
      .single();
    return data?.company_id || null;
  };

  const fetchSetores = async () => {
    setLoadingSetores(true);
    try {
      const cid = companyId || await getCompanyId();
      if (!cid) return;
      if (!companyId) setCompanyId(cid);

      const { data, error } = await supabase
        .from('sectors')
        .select('id, nome, descricao')
        .eq('company_id', cid)
        .order('nome');

      if (error) throw error;
      setSetores(data || []);
    } catch {
      toast({ title: 'Erro', description: 'Erro ao carregar setores.', variant: 'destructive' });
    } finally {
      setLoadingSetores(false);
    }
  };

  useEffect(() => {
    fetchSetores();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe o nome do setor.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const cid = companyId || await getCompanyId();
      if (!cid) {
        toast({ title: 'Erro', description: 'Empresa não encontrada.', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.from('sectors').insert({
        company_id: cid,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
      });

      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso!', description: 'Setor criado com sucesso.' });
        setNome('');
        setDescricao('');
        fetchSetores();
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro ao conectar com o servidor.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      // Check if sector is used in purchase orders
      const setor = setores.find(s => s.id === id);
      if (setor) {
        const { count } = await supabase
          .from('purchase_orders')
          .select('id', { count: 'exact', head: true })
          .eq('setor', setor.nome);

        if (count && count > 0) {
          toast({
            title: 'Não é possível excluir',
            description: `Este setor possui ${count} ordem(ns) de compra vinculada(s).`,
            variant: 'destructive',
          });
          setDeletingId(null);
          setConfirmDeleteId(null);
          return;
        }
      }

      const { error } = await supabase.from('sectors').delete().eq('id', id);

      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso!', description: 'Setor excluído com sucesso.' });
        setSetores(prev => prev.filter(s => s.id !== id));
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro ao conectar com o servidor.', variant: 'destructive' });
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Criar Setor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Setor *</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Almoxarifado Central" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição do setor (opcional)" />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                <Save className="w-4 h-4" />
                {loading ? 'Criando...' : 'Criar Setor'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Setores Cadastrados</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchSetores} disabled={loadingSetores}>
              <RefreshCw className={`w-4 h-4 ${loadingSetores ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingSetores ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : setores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum setor cadastrado.</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {setores.map((setor) => (
                      <TableRow key={setor.id}>
                        <TableCell className="font-medium">{setor.nome}</TableCell>
                        <TableCell>{setor.descricao || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setConfirmDeleteId(setor.id)}
                            disabled={deletingId === setor.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o setor "{setores.find(s => s.id === confirmDeleteId)?.nome}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)} disabled={!!deletingId}>
              {deletingId ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default CriarSetor;
