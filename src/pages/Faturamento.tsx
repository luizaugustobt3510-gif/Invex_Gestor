import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Receipt, Download, Loader2, CheckCircle2, XCircle, RotateCcw, Eye } from 'lucide-react';
import { writeExcelFromJson } from '@/lib/excelUtils';

interface DispensationRow {
  id: string;
  created_at: string;
  patient_id: string | null;
  patient_name: string | null;
  material_nome: string | null;
  material_codigo: string | null;
  quantidade: number;
  unidade: string | null;
  exam_type: string | null;
  valor_unitario: number | null;
  valor_total: number | null;
  billing_status: string;
  destino_tipo: string;
  destino_sector_nome: string | null;
}

interface GroupRow {
  key: string;
  created_at: string;
  patient_name: string;
  patient_id: string | null;
  exam_type: string;
  items: DispensationRow[];
  total: number;
  statuses: Set<string>;
}

const STATUS_LABEL: Record<string, string> = {
  a_faturar: 'A faturar',
  faturado: 'Faturado',
  cancelado: 'Cancelado',
  misto: 'Misto',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  a_faturar: 'outline',
  faturado: 'default',
  cancelado: 'destructive',
  misto: 'secondary',
};

const today = () => new Date().toISOString().slice(0, 10);

export default function Faturamento() {
  const { user } = useAuth();
  const [rows, setRows] = useState<DispensationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string>('');

  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [exam, setExam] = useState('');

  const [viewing, setViewing] = useState<GroupRow | null>(null);

  const canEdit = user?.role === 'superadm' || user?.role === 'admin' || user?.role === 'financeiro';

  const load = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('material_dispensations')
      .select('id, created_at, patient_id, patient_name, material_nome, material_codigo, quantidade, unidade, exam_type, valor_unitario, valor_total, billing_status, destino_tipo, destino_sector_nome')
      .eq('company_id', user.companyId)
      .eq('destino_tipo', 'paciente')
      .order('created_at', { ascending: false })
      .limit(2000);
    if (error) toast.error('Erro ao carregar');
    setRows((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.companyId]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (dateFrom && r.created_at < dateFrom) return false;
      if (dateTo && r.created_at > dateTo + 'T23:59:59') return false;
      if (status !== 'all' && r.billing_status !== status) return false;
      if (exam && !(r.exam_type || '').toLowerCase().includes(exam.toLowerCase())) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${r.patient_name || ''} ${r.material_nome || ''} ${r.material_codigo || ''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, dateFrom, dateTo, status, exam, search]);

  // Group by patient + exam + minute of created_at (one dispensation event)
  const groups = useMemo<GroupRow[]>(() => {
    const map = new Map<string, GroupRow>();
    filtered.forEach(r => {
      const minute = r.created_at.slice(0, 16); // YYYY-MM-DDTHH:MM
      const key = `${r.patient_id || r.patient_name || 'x'}|${r.exam_type || ''}|${minute}`;
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          created_at: r.created_at,
          patient_name: r.patient_name || '-',
          patient_id: r.patient_id,
          exam_type: r.exam_type || '-',
          items: [],
          total: 0,
          statuses: new Set(),
        };
        map.set(key, g);
      }
      g.items.push(r);
      g.total += Number(r.valor_total || 0);
      g.statuses.add(r.billing_status);
    });
    return Array.from(map.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [filtered]);

  const totals = useMemo(() => {
    let aFaturar = 0, faturado = 0, cancelado = 0;
    filtered.forEach(r => {
      const v = Number(r.valor_total || 0);
      if (r.billing_status === 'a_faturar') aFaturar += v;
      else if (r.billing_status === 'faturado') faturado += v;
      else if (r.billing_status === 'cancelado') cancelado += v;
    });
    return { aFaturar, faturado, cancelado, count: groups.length, items: filtered.length };
  }, [filtered, groups]);

  const updateStatusBulk = async (ids: string[], newStatus: string) => {
    setSaving(ids.join(','));
    const { error } = await supabase
      .from('material_dispensations')
      .update({ billing_status: newStatus })
      .in('id', ids);
    if (error) toast.error('Erro ao atualizar', { description: error.message });
    else { toast.success('Status atualizado'); await load(); }
    setSaving('');
    if (viewing) {
      const refreshed = groups.find(g => g.key === viewing.key);
      setViewing(refreshed || null);
    }
  };

  const updateValor = async (id: string, valor: number, qtd: number) => {
    setSaving(id);
    const { error } = await supabase
      .from('material_dispensations')
      .update({ valor_unitario: valor, valor_total: valor * qtd })
      .eq('id', id);
    if (error) toast.error('Erro', { description: error.message });
    else await load();
    setSaving('');
  };

  const exportExcel = async () => {
    const data = filtered.map(r => ({
      Data: new Date(r.created_at).toLocaleString('pt-BR'),
      Paciente: r.patient_name || '',
      Exame: r.exam_type || '',
      Codigo: r.material_codigo || '',
      Material: r.material_nome || '',
      Quantidade: r.quantidade,
      Unidade: r.unidade || '',
      ValorUnit: r.valor_unitario || 0,
      ValorTotal: r.valor_total || 0,
      Status: STATUS_LABEL[r.billing_status] || r.billing_status,
    }));
    await writeExcelFromJson('faturamento.xlsx', 'Faturamento', data);
  };

  const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const groupStatus = (g: GroupRow): string => {
    if (g.statuses.size === 1) return Array.from(g.statuses)[0];
    return 'misto';
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Receipt className="w-5 h-5" /> Faturamento
            </CardTitle>
            <Button size="sm" variant="outline" onClick={exportExcel}>
              <Download className="w-4 h-4 mr-1" /> Exportar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
              <div>
                <Label className="text-xs">De</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Até</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="a_faturar">A faturar</SelectItem>
                    <SelectItem value="faturado">Faturado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Exame</Label>
                <Input placeholder="filtrar..." value={exam} onChange={e => setExam(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Paciente/Material</Label>
                <Input placeholder="buscar..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Dispensações</div>
                <div className="text-lg font-semibold">{totals.count} <span className="text-xs text-muted-foreground font-normal">({totals.items} itens)</span></div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">A faturar</div>
                <div className="text-lg font-semibold">{money(totals.aFaturar)}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Faturado</div>
                <div className="text-lg font-semibold text-primary">{money(totals.faturado)}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Cancelado</div>
                <div className="text-lg font-semibold text-muted-foreground">{money(totals.cancelado)}</div>
              </div>
            </div>

            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-2">Data/Hora</th>
                    <th className="p-2">Paciente</th>
                    <th className="p-2">Exame</th>
                    <th className="p-2 text-right">Itens</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-6"><Loader2 className="w-4 h-4 animate-spin inline" /></td></tr>
                  ) : groups.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">Nenhum registro</td></tr>
                  ) : groups.map(g => {
                    const st = groupStatus(g);
                    return (
                      <tr
                        key={g.key}
                        className="border-t hover:bg-muted/30 cursor-pointer"
                        onClick={() => setViewing(g)}
                      >
                        <td className="p-2 whitespace-nowrap">
                          <div>{new Date(g.created_at).toLocaleDateString('pt-BR')}</div>
                          <div className="text-xs text-muted-foreground">{new Date(g.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="p-2 font-medium">{g.patient_name}</td>
                        <td className="p-2">{g.exam_type}</td>
                        <td className="p-2 text-right">{g.items.length}</td>
                        <td className="p-2 text-right font-medium">{money(g.total)}</td>
                        <td className="p-2">
                          <Badge variant={STATUS_VARIANT[st] || 'outline'}>{STATUS_LABEL[st] || st}</Badge>
                        </td>
                        <td className="p-2 text-right whitespace-nowrap">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setViewing(g); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {viewing?.patient_name} — {viewing?.exam_type}
            </DialogTitle>
            <div className="text-xs text-muted-foreground">
              {viewing && new Date(viewing.created_at).toLocaleString('pt-BR')}
            </div>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3">
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-2">Material</th>
                      <th className="p-2 text-right">Qtd</th>
                      <th className="p-2 text-right">Valor unit.</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewing.items.map(r => (
                      <tr key={r.id} className="border-t">
                        <td className="p-2">
                          <div className="text-xs text-muted-foreground">{r.material_codigo}</div>
                          <div>{r.material_nome}</div>
                        </td>
                        <td className="p-2 text-right whitespace-nowrap">{r.quantidade} {r.unidade || ''}</td>
                        <td className="p-2 text-right">
                          {canEdit ? (
                            <Input
                              type="number" step="0.01" className="h-7 text-right w-24 inline-block"
                              defaultValue={r.valor_unitario || 0}
                              onBlur={e => {
                                const v = Number(e.target.value);
                                if (v !== (r.valor_unitario || 0)) updateValor(r.id, v, r.quantidade);
                              }}
                            />
                          ) : money(r.valor_unitario || 0)}
                        </td>
                        <td className="p-2 text-right font-medium">{money(r.valor_total || 0)}</td>
                        <td className="p-2">
                          <Badge variant={STATUS_VARIANT[r.billing_status] || 'outline'}>
                            {STATUS_LABEL[r.billing_status] || r.billing_status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/30">
                      <td className="p-2 font-semibold" colSpan={3}>Total</td>
                      <td className="p-2 text-right font-semibold">{money(viewing.total)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {canEdit && (
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button size="sm" variant="outline" disabled={!!saving}
                    onClick={() => updateStatusBulk(viewing.items.map(i => i.id), 'a_faturar')}>
                    <RotateCcw className="w-4 h-4 mr-1" /> Reabrir
                  </Button>
                  <Button size="sm" variant="destructive" disabled={!!saving}
                    onClick={() => updateStatusBulk(viewing.items.map(i => i.id), 'cancelado')}>
                    <XCircle className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                  <Button size="sm" disabled={!!saving}
                    onClick={() => updateStatusBulk(viewing.items.map(i => i.id), 'faturado')}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Marcar faturado
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
