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
import { Search, Loader2, Check, ChevronsUpDown, ClipboardCheck, History, User as UserIcon, Building2, Plus, X } from 'lucide-react';
import { logisticaService } from '@/services/logisticaService';

interface MaterialRow {
  id: string;
  codigo: string;
  material: string;
  unidade: string | null;
  quantidade: number;
  preco_unitario: number | null;
}
interface SectorStockRow {
  material_id: string;
  quantidade: number;
  codigo: string;
  material: string;
  unidade: string | null;
  preco_unitario: number | null;
}
interface Patient { id: string; nome: string; }
interface Sector { id: string; nome: string; }
interface HistoryRow {
  id: string;
  kind: 'consumo' | 'transferencia';
  quantidade: number;
  material_nome: string;
  material_codigo: string;
  unidade: string | null;
  patient_name?: string | null;
  sector_nome?: string | null;
  exam_type?: string | null;
  observacoes?: string | null;
  created_at: string;
}
interface CartItem { materialId: string; codigo: string; nome: string; unidade: string | null; qty: number; max?: number; preco: number | null; }

type Mode = 'paciente' | 'interna';

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

  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [sectorStock, setSectorStock] = useState<SectorStockRow[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [patientId, setPatientId] = useState('');
  const [patientPop, setPatientPop] = useState(false);
  const [sourceSectorId, setSourceSectorId] = useState(''); // paciente: setor de origem
  const [targetSectorId, setTargetSectorId] = useState(''); // interna: setor destino
  const [examType, setExamType] = useState('');
  const [obs, setObs] = useState('');

  const load = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    const [mat, pac, sec] = await Promise.all([
      supabase.from('materials').select('id, codigo, material, unidade, quantidade, preco_unitario')
        .eq('company_id', user.companyId).order('material'),
      supabase.from('patients').select('id, nome').eq('company_id', user.companyId).order('nome'),
      supabase.from('sectors').select('id, nome').eq('company_id', user.companyId).order('nome'),
    ]);
    setMaterials((mat.data as MaterialRow[]) || []);
    setPatients((pac.data as Patient[]) || []);
    setSectors((sec.data as Sector[]) || []);
    await loadHistory();
    setLoading(false);
  };

  const loadHistory = async () => {
    if (!user?.companyId) return;
    // Consumo assistencial + últimas transferências, unificados
    const [cons, transf] = await Promise.all([
      supabase.from('patient_consumptions')
        .select('id, quantidade, exam_type, observacoes, created_at, patient_id, material_id, sector_id, patients(nome), materials(codigo, material, unidade), sectors(nome)')
        .eq('company_id', user.companyId).order('created_at', { ascending: false }).limit(30),
      supabase.from('stock_movements')
        .select('id, quantidade, obs, created_at, tipo, material_id, sector_id, materials(codigo, material, unidade), sectors(nome)')
        .eq('company_id', user.companyId).eq('tipo', 'transferencia').order('created_at', { ascending: false }).limit(30),
    ]);
    const rows: HistoryRow[] = [];
    (cons.data || []).forEach((r: any) => rows.push({
      id: r.id, kind: 'consumo', quantidade: r.quantidade,
      material_nome: r.materials?.material || '—', material_codigo: r.materials?.codigo || '—',
      unidade: r.materials?.unidade || null, patient_name: r.patients?.nome,
      sector_nome: r.sectors?.nome, exam_type: r.exam_type, observacoes: r.observacoes,
      created_at: r.created_at,
    }));
    (transf.data || []).forEach((r: any) => rows.push({
      id: r.id, kind: 'transferencia', quantidade: r.quantidade,
      material_nome: r.materials?.material || '—', material_codigo: r.materials?.codigo || '—',
      unidade: r.materials?.unidade || null, sector_nome: r.sectors?.nome,
      observacoes: r.obs, created_at: r.created_at,
    }));
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    setHistory(rows.slice(0, 50));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.companyId]);

  // Carrega saldo do setor de origem quando muda (modo paciente)
  useEffect(() => {
    (async () => {
      if (!user?.companyId || mode !== 'paciente' || !sourceSectorId) { setSectorStock([]); return; }
      const { data } = await logisticaService.getSectorStock(user.companyId, sourceSectorId);
      const rows: SectorStockRow[] = (data || []).map((r: any) => ({
        material_id: r.material_id,
        quantidade: Number(r.quantidade),
        codigo: r.materials?.codigo || '',
        material: r.materials?.material || '',
        unidade: r.materials?.unidade || null,
        preco_unitario: r.materials?.preco_unitario ?? r.materials?.preco ?? null,
      })).filter(r => r.quantidade > 0);
      setSectorStock(rows);
      setCart([]);
    })();
  }, [user?.companyId, mode, sourceSectorId]);

  const source = mode === 'paciente' ? sectorStock : materials.map(m => ({
    material_id: m.id, quantidade: Number(m.quantidade), codigo: m.codigo,
    material: m.material, unidade: m.unidade, preco_unitario: m.preco_unitario,
  } as SectorStockRow));

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return source;
    return source.filter(m => m.material.toLowerCase().includes(s) || m.codigo.toLowerCase().includes(s));
  }, [source, search]);

  const addToCart = (m: SectorStockRow) => {
    setCart(prev => prev.find(c => c.materialId === m.material_id) ? prev : [
      ...prev,
      { materialId: m.material_id, codigo: m.codigo, nome: m.material, unidade: m.unidade, qty: 1, max: m.quantidade, preco: m.preco_unitario },
    ]);
  };
  const updateQty = (id: string, qty: number) => setCart(prev => prev.map(c => c.materialId === id ? { ...c, qty } : c));
  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.materialId !== id));

  const register = async () => {
    if (!user?.companyId) return;
    if (cart.length === 0) { toast.error('Adicione pelo menos um material'); return; }
    if (mode === 'paciente') {
      if (!sourceSectorId) { toast.error('Selecione o setor de origem'); return; }
      if (!patientId) { toast.error('Selecione o paciente'); return; }
    }
    if (mode === 'interna' && !targetSectorId) { toast.error('Selecione o setor destinatário'); return; }
    for (const c of cart) {
      if (!c.qty || c.qty <= 0) { toast.error(`Quantidade inválida para ${c.nome}`); return; }
      if (c.max !== undefined && c.qty > c.max) {
        toast.error(`Saldo insuficiente para ${c.nome}`, { description: `Disponível: ${c.max}` });
        return;
      }
    }

    setSaving(true);
    try {
      if (mode === 'paciente') {
        // Insere consumo (trigger debita sector_stock + cria material_dispensations)
        const { data: authRes } = await supabase.auth.getUser();
        const proId = authRes.user?.id ?? null;
        const rows = cart.map(c => ({
          company_id: user.companyId!,
          patient_id: patientId,
          sector_id: sourceSectorId,
          material_id: c.materialId,
          quantidade: c.qty,
          valor_unitario: c.preco ?? null,
          exam_type: examType.trim() || null,
          observacoes: obs.trim() || null,
          professional_user_id: proId,
        }));
        const { error } = await supabase.from('patient_consumptions').insert(rows);
        if (error) throw error;

      } else {
        // Transferência avulsa item a item via RPC
        for (const c of cart) {
          const { error } = await logisticaService.transferToSector(
            user.companyId!, c.materialId, targetSectorId, c.qty, obs.trim() || undefined,
          );
          if (error) throw error;
        }
      }

      toast.success(`${cart.length} item(ns) registrado(s)`);
      setCart([]); setObs(''); setExamType('');
      if (mode === 'paciente') setPatientId('');
      else setTargetSectorId('');
      await load();
    } catch (e: any) {
      toast.error('Erro ao registrar', { description: e?.message });
    } finally {
      setSaving(false);
    }
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
                ? 'Consumo assistencial: debita do saldo do setor e gera registro faturável.'
                : 'Transferência avulsa do estoque central para um setor. Debita o estoque e credita o setor.'}
            </p>
            {(allowPaciente && allowInterna) && (
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant={mode === 'paciente' ? 'default' : 'outline'} onClick={() => setMode('paciente')}>
                  <UserIcon className="w-4 h-4 mr-1" /> Consumo (paciente)
                </Button>
                <Button size="sm" variant={mode === 'interna' ? 'default' : 'outline'} onClick={() => setMode('interna')}>
                  <Building2 className="w-4 h-4 mr-1" /> Transferir p/ setor
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
              <>
                {mode === 'paciente' && (
                  <div className="rounded-lg border p-3 bg-muted/30 space-y-1.5">
                    <Label className="text-xs">Setor de origem *</Label>
                    <Select value={sourceSectorId} onValueChange={setSourceSectorId}>
                      <SelectTrigger><SelectValue placeholder="Selecionar setor de onde sairão os materiais" /></SelectTrigger>
                      <SelectContent>
                        {sectors.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground">Nenhum setor cadastrado.</div>
                        ) : sectors.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Somente materiais previamente entregues a este setor pela logística aparecerão abaixo.
                    </p>
                  </div>
                )}

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
                      ) : mode === 'paciente' && !sourceSectorId ? (
                        <div className="text-center py-6 text-sm text-muted-foreground">Selecione o setor de origem</div>
                      ) : filtered.length === 0 ? (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                          {mode === 'paciente' ? 'Setor sem saldo. Solicite ao almoxarifado.' : 'Nenhum material'}
                        </div>
                      ) : (
                        filtered.slice(0, 100).map(m => {
                          const inCart = cart.find(c => c.materialId === m.material_id);
                          return (
                            <button key={m.material_id} onClick={() => addToCart(m)} disabled={!!inCart}
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
                          <div key={c.materialId} className="flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{c.nome}</div>
                              <div className="text-xs text-muted-foreground">
                                {c.codigo} · {c.unidade || 'un'}{c.max !== undefined && ` · máx: ${c.max}`}
                              </div>
                            </div>
                            <Input type="number" min="0.01" step="0.01" className="w-20 h-8"
                              value={c.qty} onChange={e => updateQty(c.materialId, Number(e.target.value))} />
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(c.materialId)}>
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
                            <Label className="text-xs">Paciente *</Label>
                            <Popover open={patientPop} onOpenChange={setPatientPop}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                  {selectedPatient?.nome || 'Selecionar paciente'}
                                  <ChevronsUpDown className="w-4 h-4 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                  <CommandInput placeholder="Buscar..." />
                                  <CommandList>
                                    <CommandEmpty>Nenhum paciente</CommandEmpty>
                                    <CommandGroup>
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
                          <Select value={targetSectorId} onValueChange={setTargetSectorId}>
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
                        {mode === 'paciente' ? `Registrar consumo (${cart.length})` : `Transferir para setor (${cart.length})`}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
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
                  <div key={`${h.kind}-${h.id}`} className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={h.kind === 'consumo' ? 'default' : 'secondary'} className="text-[10px]">
                          {h.kind === 'consumo' ? 'Consumo' : 'Transferência'}
                        </Badge>
                        <div className="font-medium truncate">
                          {h.material_nome} <span className="text-muted-foreground text-xs">({h.material_codigo})</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                        <span>Qtd: <b>{h.quantidade} {h.unidade || ''}</b></span>
                        {h.patient_name && <span>Paciente: {h.patient_name}</span>}
                        {h.sector_nome && <span>Setor: {h.sector_nome}</span>}
                        {h.exam_type && <span>Exame: {h.exam_type}</span>}
                        <span>{new Date(h.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      {h.observacoes && <div className="text-xs mt-1 italic">{h.observacoes}</div>}
                    </div>
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
