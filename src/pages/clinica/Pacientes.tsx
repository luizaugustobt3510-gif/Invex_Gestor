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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FileText, User, ClipboardList, Activity, Pencil, Trash2, Pill } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Patient {
  id: string;
  nome: string;
  cpf: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  is_active: boolean;
  created_at?: string | null;
}

// ----- Masks & helpers -----
const onlyDigits = (v: string) => (v || '').replace(/\D/g, '');

const maskCPF = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};

const maskDateBR = (v: string) => {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2');
};

const parseDateBRtoISO = (br: string): string | null => {
  const d = onlyDigits(br);
  if (d.length !== 8) return null;
  const dd = parseInt(d.slice(0, 2), 10);
  const mm = parseInt(d.slice(2, 4), 10);
  const yyyy = parseInt(d.slice(4, 8), 10);
  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;
  if (yyyy < 1900 || yyyy > 2100) return null;
  const iso = `${yyyy.toString().padStart(4, '0')}-${mm.toString().padStart(2, '0')}-${dd.toString().padStart(2, '0')}`;
  const dt = new Date(iso + 'T00:00:00');
  if (isNaN(dt.getTime())) return null;
  return iso;
};

const isoToBR = (iso?: string | null) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const isValidCPFDigits = (cpfStr: string) => onlyDigits(cpfStr).length === 11;

const emptyForm = {
  nome: '',
  cpf: '',
  birth_date_br: '',
  phone: '',
  email: '',
  gender: '',
  height_cm: '',
  weight_kg: '',
  address: '',
  notes: '',
};

export default function Pacientes() {
  const { user } = useAuth();
  const { canAccessModule } = useModuleAccess();
  const hasAnamnese = canAccessModule('anamnese');
  const hasEvolucao = canAccessModule('evolucao');
  const hasReceituario = canAccessModule('receituario');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const today = new Date().toLocaleDateString('en-CA');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState<Patient | null>(null);

  const isAdmin = ['super_admin', 'admin_empresa', 'superadm', 'admin', 'clinica', 'enfermagem', 'enfermeiro'].includes(user?.role || '');

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

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: Patient) => {
    setEditing(p);
    setForm({
      nome: p.nome || '',
      cpf: p.cpf || '',
      birth_date_br: isoToBR(p.birth_date),
      phone: p.phone || '',
      email: p.email || '',
      gender: p.gender || '',
      height_cm: p.height_cm != null ? String(p.height_cm) : '',
      weight_kg: p.weight_kg != null ? String(p.weight_kg) : '',
      address: (p as any).address || '',
      notes: (p as any).notes || '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!user?.companyId) return;

    if (!form.nome.trim()) return toast.error('Informe o nome do paciente');
    if (!form.cpf.trim() || !isValidCPFDigits(form.cpf)) return toast.error('Informe um CPF válido (11 dígitos)');
    if (!form.gender) return toast.error('Selecione o sexo');
    if (!form.height_cm.trim() || Number(form.height_cm) <= 0) return toast.error('Informe a altura');
    if (!form.weight_kg.trim() || Number(form.weight_kg) <= 0) return toast.error('Informe o peso');

    let iso: string | null = null;
    if (form.birth_date_br.trim()) {
      iso = parseDateBRtoISO(form.birth_date_br);
      if (!iso) return toast.error('Data de nascimento inválida (use DD/MM/AAAA)');
    }

    const cpfMasked = maskCPF(form.cpf);

    // Duplicate CPF check within same company (excluding self on edit)
    let dupQuery = supabase
      .from('patients')
      .select('id, nome')
      .eq('company_id', user.companyId)
      .eq('cpf', cpfMasked);
    if (editing) dupQuery = dupQuery.neq('id', editing.id);
    const { data: existing } = await dupQuery.maybeSingle();
    if (existing) {
      toast.error(`Paciente já cadastrado (${existing.nome})`);
      return;
    }

    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      cpf: cpfMasked,
      birth_date: iso,
      phone: form.phone ? maskPhone(form.phone) : null,
      email: form.email || null,
      gender: form.gender,
      height_cm: Number(form.height_cm),
      weight_kg: Number(form.weight_kg),
      address: form.address || null,
      notes: form.notes || null,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from('patients').update(payload as any).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('patients').insert({
        ...payload,
        company_id: user.companyId,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      } as any));
    }
    setSaving(false);

    if (error) {
      if ((error as any).code === '23505' || /duplicate|unique/i.test(error.message)) {
        toast.error('Paciente com este CPF já cadastrado.');
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success(editing ? 'Paciente atualizado' : 'Paciente cadastrado');
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    load();
  };

  const doDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('patients').delete().eq('id', deleting.id);
    if (error) {
      toast.error(
        error.message.includes('foreign')
          ? 'Não é possível excluir: o paciente possui registros vinculados (anamneses, prontuários, dispensações).'
          : error.message
      );
      return;
    }
    toast.success('Paciente excluído');
    setDeleting(null);
    load();
  };

  const filtered = patients.filter(p => {
    const matchSearch = !search.trim() || p.nome.toLowerCase().includes(search.toLowerCase())
      || (p.cpf || '').includes(search);
    if (!matchSearch) return false;
    if (dateFrom || dateTo) {
      if (!p.created_at) return false;
      const day = p.created_at.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
    }
    return true;
  });

  const formatCadastro = (v?: string | null) =>
    v ? new Date(v).toLocaleDateString('pt-BR') : '-';

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pacientes</h1>
            <p className="text-sm text-muted-foreground">Gerencie pacientes e acesse o prontuário clínico.</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={openNew}><Plus className="w-4 h-4" /> Novo paciente</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? 'Editar paciente' : 'Novo paciente'}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Nome *</Label>
                  <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div>
                  <Label>CPF *</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={e => setForm({ ...form, cpf: maskCPF(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Sexo *</Label>
                  <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Altura (cm) *</Label>
                  <Input
                    inputMode="decimal"
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="170"
                    value={form.height_cm}
                    onChange={e => setForm({ ...form, height_cm: e.target.value.replace(/[^0-9.]/g, '') })}
                  />
                </div>
                <div>
                  <Label>Peso (kg) *</Label>
                  <Input
                    inputMode="decimal"
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="70.5"
                    value={form.weight_kg}
                    onChange={e => setForm({ ...form, weight_kg: e.target.value.replace(/[^0-9.]/g, '') })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-4 h-4" /> Lista de pacientes</CardTitle>
            <div className="flex flex-col md:flex-row md:items-end gap-3 pt-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por nome ou CPF..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <div>
                  <Label className="text-xs">Cadastro de</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">até</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
                {(dateFrom || dateTo) && (
                  <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Limpar</Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center text-muted-foreground py-8">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {dateFrom === today && dateTo === today && !search.trim()
                  ? 'Nenhum paciente cadastrado hoje.'
                  : 'Nenhum paciente encontrado.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{p.cpf || '-'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatCadastro(p.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1 flex-nowrap whitespace-nowrap">
                          <Button asChild size="sm" variant="outline" className="h-8 px-2 gap-1 text-xs">
                            <Link to={`/clinica/pacientes/${p.id}`}>
                              <FileText className="w-3.5 h-3.5" /> Prontuário
                            </Link>
                          </Button>
                          {hasAnamnese && (
                            <Button
                              asChild
                              size="sm"
                              className="h-8 px-2 gap-1 text-xs bg-sky-500 hover:bg-sky-600 text-white"
                            >
                              <Link to={`/clinica/anamnese/nova?patient=${p.id}`}>
                                <ClipboardList className="w-3.5 h-3.5" /> Anamnese
                              </Link>
                            </Button>
                          )}
                          {hasEvolucao && (
                            <Button asChild size="sm" variant="secondary" className="h-8 px-2 gap-1 text-xs">
                              <Link to={`/clinica/evolucao/${p.id}`}>
                                <Activity className="w-3.5 h-3.5" /> Evolução
                              </Link>
                            </Button>
                          )}
                          {hasReceituario && (
                            <Button
                              asChild
                              size="sm"
                              className="h-8 px-2 gap-1 text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-900 border border-yellow-300"
                            >
                              <Link to={`/clinica/receituario/${p.id}`}>
                                <Pill className="w-3.5 h-3.5" /> Receita
                              </Link>
                            </Button>
                          )}
                          {isAdmin && (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)} title="Editar paciente">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(p)} title="Excluir paciente">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Confirm delete dialog */}
        <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir paciente</DialogTitle>
            </DialogHeader>
            <p className="text-sm">
              Deseja excluir permanentemente <strong>{deleting?.nome}</strong>?
              Registros vinculados (anamneses, prontuários) precisam ser removidos antes.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={doDelete}>Excluir</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
