import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Package, Search, Loader2, Check, ChevronsUpDown, ClipboardCheck, History, Trash2 } from 'lucide-react';

interface Material {
  id: string;
  codigo: string;
  material: string;
  unidade: string | null;
  quantidade: number;
  localizacao: string | null;
}
interface Patient { id: string; nome: string; }
interface Dispensation {
  id: string;
  patient_name: string | null;
  material_nome: string | null;
  material_codigo: string | null;
  quantidade: number;
  unidade: string | null;
  observacoes: string | null;
  created_at: string;
}

export default function Dispensacao() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [history, setHistory] = useState<Dispensation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Material | null>(null);
  const [patientId, setPatientId] = useState('');
  const [patientPop, setPatientPop] = useState(false);
  const [qty, setQty] = useState('1');
  const [obs, setObs] = useState('');

  const load = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    const [mat, pac, hist] = await Promise.all([
      supabase.from('materials').select('id, codigo, material, unidade, quantidade, localizacao')
        .eq('company_id', user.companyId).order('material'),
      supabase.from('patients').select('id, nome').eq('company_id', user.companyId).order('nome'),
      supabase.from('material_dispensations').select('*')
        .eq('company_id', user.companyId).order('created_at', { ascending: false }).limit(50),
    ]);
    setMaterials((mat.data as Material[]) || []);
    setPatients((pac.data as Patient[]) || []);
    setHistory((hist.data as Dispensation[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.companyId]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return materials;
    return materials.filter(m => m.material.toLowerCase().includes(s) || m.codigo.toLowerCase().includes(s));
  }, [materials, search]);

  const register = async () => {
    if (!user?.companyId || !selected) return;
    const q = Number(qty);
    if (!q || q <= 0) { toast.error('Quantidade inválida'); return; }
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser.user) return;
    setSaving(true);
    try {
      const patient = patients.find(p => p.id === patientId);
      const { error } = await supabase.from('material_dispensations').insert({
        company_id: user.companyId,
        user_id: authUser.user.id,
        patient_id: patientId || null,
        patient_name: patient?.nome || null,
        material_id: selected.id,
        material_codigo: selected.codigo,
        material_nome: selected.material,
        quantidade: q,
        unidade: selected.unidade,
        observacoes: obs.trim() || null,
      });
      if (error) throw error;
      toast.success('Dispensação registrada');
      setSelected(null);
      setQty('1');
      setObs('');
      setPatientId('');
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
              Registre o uso de insumos por paciente/atendimento. Este registro não altera o saldo do estoque.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              {/* Lista materiais */}
              <div className="space-y-2">
                <Label>1. Selecione o material</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Buscar por código ou nome..."
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="rounded-lg border max-h-[320px] overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin" /></div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">Nenhum material</div>
                  ) : (
                    filtered.slice(0, 100).map(m => (
                      <button key={m.id} onClick={() => setSelected(m)}
                        className={`w-full text-left px-3 py-2 border-b last:border-0 hover:bg-muted transition-colors ${selected?.id === m.id ? 'bg-primary/10' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{m.material}</div>
                            <div className="text-xs text-muted-foreground">
                              {m.codigo} · {m.unidade || 'un'} · Saldo: {m.quantidade}
                            </div>
                          </div>
                          {selected?.id === m.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Formulário */}
              <div className="space-y-3">
                <Label>2. Detalhes da dispensação</Label>
                <div className="rounded-lg border p-3 bg-muted/20 space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Material</div>
                    <div className="text-sm font-medium">
                      {selected ? `${selected.codigo} — ${selected.material}` : <span className="text-muted-foreground">Selecione ao lado</span>}
                    </div>
                  </div>

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
                              <CommandItem value="__none" onSelect={() => { setPatientId(''); setPatientPop(false); }}>
                                Sem paciente
                              </CommandItem>
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

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quantidade</Label>
                      <Input type="number" inputMode="decimal" step="0.01" min="0.01"
                        value={qty} onChange={(e) => setQty(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Unidade</Label>
                      <Input value={selected?.unidade || '—'} disabled />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Observações</Label>
                    <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
                  </div>

                  <Button className="w-full" onClick={register} disabled={saving || !selected}>
                    {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                    Registrar dispensação
                  </Button>
                </div>
              </div>
            </div>
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
                      <div className="font-medium truncate">{h.material_nome} <span className="text-muted-foreground text-xs">({h.material_codigo})</span></div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                        <span>Qtd: <b>{h.quantidade} {h.unidade || ''}</b></span>
                        {h.patient_name && <span>Paciente: {h.patient_name}</span>}
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
