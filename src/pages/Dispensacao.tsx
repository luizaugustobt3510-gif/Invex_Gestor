import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { Search, Loader2, Check, ChevronsUpDown, ClipboardCheck, History, Trash2, User as UserIcon, Building2, Plus, X } from 'lucide-react';

interface Material {
  id: string;
  codigo: string;
  material: string;
  unidade: string | null;
  quantidade: number;
  preco_unitario: number | null;
}
interface Patient { id: string; nome: string; }
interface Sector { id: string; nome: string; }
interface Dispensation {
  id: string;
  patient_name: string | null;
  material_nome: string | null;
  material_codigo: string | null;
  quantidade: number;
  unidade: string | null;
  observacoes: string | null;
  destino_tipo: string;
  destino_sector_nome: string | null;
  exam_type: string | null;
  created_at: string;
}
interface CartItem { material: Material; qty: number; }

type Mode = 'paciente' | 'interna';

// Roles allowed for each mode. Logistics NEVER dispenses to patients.
const CLINICAL_ROLES = new Set(['admin', 'superadm', 'clinica', 'enfermagem', 'enfermeiro', 'recepcionista']);
const LOGISTIC_ROLES = new Set(['admin', 'superadm', 'logistica', 'usuario almox']);

export default function Dispensacao() {
  const { user } = useAuth();
  const { canAccessModule } = useModuleAccess();

  const role = user?.role || '';
  const canPacienteRole = CLINICAL_ROLES.has(role);
  const canInternaRole = LOGISTIC_ROLES.has(role);
  const allowPaciente = canPacienteRole && canAccessModule('dispensacao.paciente');
  const allowInterna = canInternaRole && canAccessModule('dispensacao.interna');
  const defaultMode: Mode = allowPaciente ? 'paciente' : 'interna';
  const [mode, setMode] = useState<Mode>(defaultMode);
  useEffect(() => { setMode(defaultMode); }, [defaultMode]);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [history, setHistory] = useState<Dispensation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [patientId, setPatientId] = useState('');
  const [patientPop, setPatientPop] = useState(false);
  const [sectorId, setSectorId] = useState('');
  const [examType, setExamType] = useState('');
  const [obs, setObs] = useState('');

  const load = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    const [mat, pac, sec, hist] = await Promise.all([
      supabase.from('materials').select('id, codigo, material, unidade, quantidade, preco_unitario')
        .eq('company_id', user.companyId).order('material'),
      supabase.from('patients').select('id, nome').eq('company_id', user.companyId).order('nome'),
      supabase.from('sectors').select('id, nome').eq('company_id', user.companyId).order('nome'),
      supabase.from('material_dispensations').select('*')
        .eq('company_id', user.companyId).order('created_at', { ascending: false }).limit(50),
    ]);
    setMaterials((mat.data as Material[]) || []);
    setPatients((pac.data as Patient[]) || []);
    setSectors((sec.data as Sector[]) || []);
    setHistory((hist.data as Dispensation[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.companyId]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return materials;
    return materials.filter(m => m.material.toLowerCase().includes(s) || m.codigo.toLowerCase().includes(s));
  }, [materials, search]);

  const addToCart = (m: Material) => {
    setCart(prev => prev.find(c => c.material.id === m.id) ? prev : [...prev, { material: m, qty: 1 }]);
  };
  const updateQty = (id: string, qty: number) => {
    setCart(prev => prev.map(c => c.material.id === id ? { ...c, qty } : c));
  };
  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(c => c.material.id !== id));
  };

  const register = async () => {
    if (!user?.companyId) return;
    if (cart.length === 0) { toast.error('Adicione pelo menos um material'); return; }
    if (mode === 'interna' && !sectorId) { toast.error('Selecione o setor destinatário'); return; }
    if (mode === 'paciente' && !patientId) { toast.error('Selecione o paciente'); return; }
    for (const c of cart) {
      if (!c.qty || c.qty <= 0) { toast.error(`Quantidade inválida para ${c.material.material}`); return; }
    }
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser.user) return;
    setSaving(true);
    try {
      const patient = patients.find(p => p.id === patientId);
      const sector = sectors.find(s => s.id === sectorId);
      const rows = cart.map(c => {
        const valorUnit = c.material.preco_unitario || null;
        const payload: any = {
          company_id: user.companyId,
          user_id: authUser.user.id,
          material_id: c.material.id,
          material_codigo: c.material.codigo,
          material_nome: c.material.material,
          quantidade: c.qty,
          unidade: c.material.unidade,
          observacoes: obs.trim() || null,
          destino_tipo: mode,
          valor_unitario: valorUnit,
          valor_total: valorUnit ? valorUnit * c.qty : null,
        };
        if (mode === 'paciente') {
          payload.patient_id = patientId || null;
          payload.patient_name = patient?.nome || null;
          payload.exam_type = examType.trim() || null;
        } else {
          payload.destino_sector_id = sectorId;
          payload.destino_sector_nome = sector?.nome || null;
        }
        return payload;
      });
      const { error } = await supabase.from('material_dispensations').insert(rows);
      if (error) throw error;
      toast.success(`${cart.length} item(ns) dispensado(s)`);
      setCart([]);
      setObs('');
      setPatientId('');
      setSectorId('');
      setExamType('');
      load();
    } catch (e: any) {
      toast.error('Erro ao registrar', { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (id: string) => {
    if (!confirm('Excluir este registro?')) return;
    const { error } = await supabase.from('material_dispensations').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir'); else load();
  };

  const selectedPatient = patients.find(p => p.id === patientId);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ClipboardCheck className="w-5 h-5" /> Dispensação de Materiais
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {mode === 'paciente'
                ? 'Registro por paciente/atendimento (clínica/enfermagem). Não altera o saldo do estoque.'
                : 'Disponibilização de material da logística para um setor. Não altera o saldo do estoque.'}
            </p>
            {(allowPaciente && allowInterna) && (
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant={mode === 'paciente' ? 'default' : 'outline'} onClick={() => setMode('paciente')}>
                  <UserIcon className="w-4 h-4 mr-1" /> Para paciente
                </Button>
                <Button size="sm" variant={mode === 'interna' ? 'default' : 'outline'} onClick={() => setMode('interna')}>
                  <Building2 className="w-4 h-4 mr-1" /> Para setor
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {(!allowPaciente && !allowInterna) ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Sem permissão para dispensação. Contate o administrador.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="space-y-2">
                  <Label>1. Materiais disponíveis</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Buscar por código ou nome..."
                      value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <div className="rounded-lg border max-h-[360px] overflow-y-auto">
                    {loading ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin" /></div>
                    ) : filtered.length === 0 ? (
                      <div className="text-center py-6 text-sm text-muted-foreground">Nenhum material</div>
                    ) : (
                      filtered.slice(0, 100).map(m => {
                        const inCart = cart.find(c => c.material.id === m.id);
                        return (
                          <button key={m.id} onClick={() => addToCart(m)} disabled={!!inCart}
                            className={`w-full text-left px-3 py-2 border-b last:border-0 hover:bg-muted transition-colors ${inCart ? 'opacity-50' : ''}`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{m.material}</div>
                                <div className="text-xs text-muted-foreground">
                                  {m.codigo} · {m.unidade || 'un'} · Saldo: {m.quantidade}
                                </div>
                              </div>
                              {inCart ? <Check className="w-4 h-4 text-primary shrink-0" /> : <Plus className="w-4 h-4 text-muted-foreground shrink-0" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>2. Itens selecionados <Badge variant="secondary">{cart.length}</Badge></Label>
                  <div className="rounded-lg border p-3 bg-muted/20 space-y-3 max-h-[220px] overflow-y-auto">
                    {cart.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-6">
                        Clique nos materiais ao lado para adicionar
                      </div>
                    ) : (
                      cart.map(c => (
                        <div key={c.material.id} className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{c.material.material}</div>
                            <div className="text-xs text-muted-foreground">{c.material.codigo} · {c.material.unidade || 'un'}</div>
                          </div>
                          <Input type="number" min="0.01" step="0.01" className="w-20 h-8"
                            value={c.qty} onChange={e => updateQty(c.material.id, Number(e.target.value))} />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(c.material.id)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>

                  <Label>3. Destino</Label>
                  <div className="rounded-lg border p-3 space-y-3">
                    {mode === 'paciente' ? (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Paciente</Label>
                          <Popover open={patientPop} onOpenChange={setPatientPop}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" className="w-full justify-between">
                                {selectedPatient?.nome || 'Selecionar paciente (opcional)'}
                                <ChevronsUpDown className="w-4 h-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                <CommandInput placeholder="Buscar..." />
                                <CommandList>
                                  <CommandEmpty>Nenhum paciente</CommandEmpty>
                                  <CommandGroup>
                                    <CommandItem value="__none" onSelect={() => { setPatientId(''); setPatientPop(false); }}>Sem paciente</CommandItem>
                                    {patients.map(p => (
                                      <CommandItem key={p.id} value={p.nome} onSelect={() => { setPatientId(p.id); setPatientPop(false); }}>
                                        <Check className={`w-4 h-4 mr-2 ${patientId === p.id ? 'opacity-100' : 'opacity-0'}`} />
                                        {p.nome}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Tipo de exame / atendimento</Label>
                          <Input value={examType} onChange={e => setExamType(e.target.value)} placeholder="Ex: Hemograma" />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Setor destinatário *</Label>
                        <Select value={sectorId} onValueChange={setSectorId}>
                          <SelectTrigger><SelectValue placeholder="Selecionar setor" /></SelectTrigger>
                          <SelectContent>
                            {sectors.length === 0 ? (
                              <div className="p-2 text-xs text-muted-foreground">Nenhum setor cadastrado.</div>
                            ) : sectors.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Observações</Label>
                      <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
                    </div>
                    <Button className="w-full" onClick={register} disabled={saving || cart.length === 0}>
                      {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                      Registrar dispensação ({cart.length})
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <History className="w-4 h-4" /> Histórico recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Sem registros ainda</div>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {h.material_nome} <span className="text-muted-foreground text-xs">({h.material_codigo})</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                        <span>Qtd: <b>{h.quantidade} {h.unidade || ''}</b></span>
                        {h.destino_tipo === 'paciente'
                          ? (h.patient_name && <span>Paciente: {h.patient_name}</span>)
                          : (h.destino_sector_nome && <span>Setor: {h.destino_sector_nome}</span>)}
                        {h.exam_type && <span>Exame: {h.exam_type}</span>}
                        <span>{new Date(h.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      {h.observacoes && <div className="text-xs mt-1 italic">{h.observacoes}</div>}
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeItem(h.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
