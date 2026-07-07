import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Send } from 'lucide-react';

const CriarUsuario = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadm';
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);

  const [formData, setFormData] = useState({
    email: '',
    nome: '',
    cargo: '',
    autenticacao: '',
    company_id: '',
  });

  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      setCompanies(data || []);
    })();
  }, [isSuperAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const email = formData.email?.trim().toLowerCase() || '';
    const nome = formData.nome?.trim() || '';
    const cargo = formData.cargo?.trim() || '';
    const autenticacao = formData.autenticacao || '';

    if (!nome) return toast({ title: 'Campo obrigatório', description: 'Informe o nome.', variant: 'destructive' });
    if (!email) return toast({ title: 'Campo obrigatório', description: 'Informe o e-mail.', variant: 'destructive' });
    if (!autenticacao) return toast({ title: 'Campo obrigatório', description: 'Selecione o perfil.', variant: 'destructive' });
    if (isSuperAdmin && !formData.company_id) return toast({ title: 'Campo obrigatório', description: 'Selecione a empresa.', variant: 'destructive' });

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Sessão expirada');

      const roleMap: Record<string, string> = {
        'admin': 'admin_empresa',
        'logistica': 'logistica',
        'usuario almox': 'usuario_almox',
        'solicitante': 'solicitante',
        'visualizador': 'visualizador',
        'rh': 'rh',
        'financeiro': 'financeiro',
        'fitness': 'fitness_user',
        'clinica': 'clinica',
        'superadm': 'super_admin',
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            email, nome, cargo,
            role: roleMap[autenticacao] || 'solicitante',
            company_id: isSuperAdmin ? formData.company_id : undefined,
            redirect_to: `${window.location.origin}/accept-invite`,
          }),
        }
      );
      const result = await response.json();
      if (result.ok) {
        toast({ title: 'Convite enviado!', description: result.msg });
        setFormData({ email: '', nome: '', cargo: '', autenticacao: '', company_id: '' });
      } else {
        toast({ title: 'Erro', description: result.error || 'Erro ao enviar convite.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Erro ao conectar.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Convidar Usuário
          </CardTitle>
          <p className="text-xs text-muted-foreground pt-1">
            O usuário receberá um e-mail para confirmar identidade e definir a própria senha.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => setFormData(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail real *</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="usuario@empresa.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input id="cargo" value={formData.cargo} onChange={(e) => setFormData(p => ({ ...p, cargo: e.target.value }))} placeholder="Ex: Analista, Coordenador" />
            </div>
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>Empresa *</Label>
                <Select value={formData.company_id} onValueChange={(v) => setFormData(p => ({ ...p, company_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                  <SelectContent>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Perfil do Usuário *</Label>
              <Select value={formData.autenticacao} onValueChange={(v) => setFormData(p => ({ ...p, autenticacao: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && <SelectItem value="superadm">Super Administrador</SelectItem>}
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="logistica">Logística</SelectItem>
                  <SelectItem value="usuario almox">Almoxarifado</SelectItem>
                  <SelectItem value="rh">Gestão de Pessoas</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="solicitante">Solicitante</SelectItem>
                  <SelectItem value="visualizador">Convidado (somente leitura)</SelectItem>
                  <SelectItem value="fitness">Invex Fitness</SelectItem>
                  <SelectItem value="clinica">Clínica (Prontuário/Agenda)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <Send className="w-4 h-4" />
              {loading ? 'Enviando convite...' : 'Enviar convite'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default CriarUsuario;
