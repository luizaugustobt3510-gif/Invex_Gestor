import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Building, RefreshCw, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  created_at: string;
}

const ListarEmpresas = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [resetDialog, setResetDialog] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, cnpj, created_at')
        .order('name');
      if (error) throw error;
      setCompanies(data || []);
    } catch {
      toast({ title: 'Erro', description: 'Erro ao carregar empresas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleReset = async () => {
    if (resetConfirmText !== 'RESETAR') return;
    setResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const { data, error } = await supabase.functions.invoke('reset-system', {
        body: { company_id: null },
      });

      if (error) throw error;

      toast({ title: 'Sistema resetado', description: 'Todos os dados operacionais foram removidos.' });
      setResetDialog(false);
      setResetConfirmText('');
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Erro ao resetar o sistema.', variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  };

  const isSuperAdmin = user?.role === 'superadm';

  return (
    <MainLayout>
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Empresas Cadastradas
          </CardTitle>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <Button variant="destructive" size="sm" onClick={() => setResetDialog(true)}>
                <AlertTriangle className="w-4 h-4 mr-1" />
                Resetar Sistema
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchCompanies} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma empresa cadastrada.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cadastrada em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono">{c.cnpj || '-'}</TableCell>
                      <TableCell>{new Date(c.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset System Dialog */}
      <Dialog open={resetDialog} onOpenChange={(open) => { if (!open) { setResetDialog(false); setResetConfirmText(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Resetar Sistema
            </DialogTitle>
            <DialogDescription>
              <strong>Esta ação é irreversível!</strong> Todos os dados operacionais serão apagados:
              materiais, estoques, movimentações, ordens de compra, solicitações e setores.
              <br /><br />
              Usuários e empresas <strong>NÃO</strong> serão afetados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Digite <strong>RESETAR</strong> para confirmar:</Label>
            <Input
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="RESETAR"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetDialog(false); setResetConfirmText(''); }}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={resetConfirmText !== 'RESETAR' || resetting}
            >
              {resetting ? 'Resetando...' : 'Confirmar Reset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ListarEmpresas;
