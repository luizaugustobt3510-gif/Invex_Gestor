import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, FileText, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Patient {
  id: string;
  nome: string;
  cpf: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

export default function Pacientes() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: '', cpf: '', birth_date: '', phone: '', email: '', gender: '', address: '', notes: '',
  });

  const load = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('company_id', user.companyId)
      .order('nome');
    if (error) toast.error('Erro ao carregar pacientes');
    setPatients((data as Patient[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.companyId]);

  const save = async () => {
    if (!form.nome.trim() || !user?.companyId) {
      toast.error('Informe o nome do paciente'); return;
    }
    const { error } = await supabase.from('patients').insert({
      company_id: user.companyId,
      nome: form.nome.trim(),
      cpf: form.cpf || null,
      birth_date: form.birth_date || null,
      phone: form.phone || null,
      email: form.email || null,
      gender: form.gender || null,
      address: form.address || null,
      notes: form.notes || null,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Paciente cadastrado');
    setOpen(false);
    setForm({ nome: '', cpf: '', birth_date: '', phone: '', email: '', gender: '', address: '', notes: '' });
    load();
  };

  const filtered = patients.filter(p =>
    !search.trim() || p.nome.toLowerCase().includes(search.toLowerCase())
    || (p.cpf || '').includes(search)
  );

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pacientes</h1>
            <p className="text-sm text-muted-foreground">Gerencie pacientes e acesse o prontuário clínico.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Novo paciente</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo paciente</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                <div><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} /></div>
                <div><Label>Nascimento</Label><Input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Sexo</Label><Input value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} /></div>
                <div><Label>Endereço</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                <div className="col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={save}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-4 h-4" /> Lista de pacientes</CardTitle>
            <div className="relative pt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nome ou CPF..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center text-muted-foreground py-8">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Nenhum paciente cadastrado.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{p.cpf || '-'}</TableCell>
                      <TableCell>{p.phone || '-'}</TableCell>
                      <TableCell>{p.email || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline" className="gap-1">
                          <Link to={`/clinica/pacientes/${p.id}`}>
                            <FileText className="w-3.5 h-3.5" /> Prontuário
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
