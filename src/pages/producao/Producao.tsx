import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Factory, PackagePlus, Camera, Clock } from 'lucide-react';
import { rendimento } from './producaoCalc';

interface Mat { id: string; codigo: string; material: string; unidade: string; quantidade: number }
interface Entry {
  id: string; material_id: string; quantidade: number; quantidade_restante: number; lote: string;
  procedencia: string; temperatura: number | null; especificacao: string | null; numero_controle: string;
  boletim: boolean; fop: string | null; observacoes: string | null; foto_path: string | null;
  custo_total: number; created_at: string;
}
interface Order {
  id: string; entry_id: string; produto_material_id: string; quantidade_consumida: number;
  quantidade_produzida: number; lote_produto: string; observacoes: string | null; created_at: string;
}

const fmtDT = (s: string) => new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

export default function Producao() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [mats, setMats] = useState<Mat[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [now, setNow] = useState(new Date());
  const [saving, setSaving] = useState(false);

  // entrada
  const [matId, setMatId] = useState('');
  const [qtd, setQtd] = useState('');
  const [lote, setLote] = useState('');
  const [proc, setProc] = useState('');
  const [temp, setTemp] = useState('');
  const [espec, setEspec] = useState('');
  const [ctrl, setCtrl] = useState('');
  const [boletim, setBoletim] = useState(false);
  const [fop, setFop] = useState('');
  const [obs, setObs] = useState('');
  const [custo, setCusto] = useState('');
  const [venc, setVenc] = useState('');
  const [foto, setFoto] = useState<File | null>(null);

  // produção
  const [entryId, setEntryId] = useState('');
  const [prodId, setProdId] = useState('');
  const [consumo, setConsumo] = useState('');
  const [produzido, setProduzido] = useState('');
  const [loteProd, setLoteProd] = useState('');
  const [obsProd, setObsProd] = useState('');

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const load = async () => {
    if (!companyId) return;
    const [m, e, o] = await Promise.all([
      supabase.from('materials').select('id, codigo, material, unidade, quantidade').eq('company_id', companyId).order('material'),
      supabase.from('raw_material_entries').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('production_orders').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    ]);
    if (m.error || e.error || o.error) { toast.error('Erro ao carregar dados'); return; }
    setMats((m.data ?? []) as Mat[]); setEntries((e.data ?? []) as Entry[]); setOrders((o.data ?? []) as Order[]);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [companyId]);

  const matById = useMemo(() => Object.fromEntries(mats.map((m) => [m.id, m])), [mats]);
  const entryById = useMemo(() => Object.fromEntries(entries.map((e) => [e.id, e])), [entries]);
  const abertos = entries.filter((e) => e.quantidade_restante > 0);
  const selEntry = entryById[entryId];
  const rend = rendimento(Number(consumo) || 0, Number(produzido) || 0);

  const salvarEntrada = async () => {
    if (!companyId || !matId || !(Number(qtd) > 0)) { toast.error('Escolha o material e a quantidade'); return; }
    setSaving(true);
    try {
      let foto_path: string | null = null;
      if (foto) {
        const ext = foto.name.split('.').pop() || 'jpg';
        foto_path = `${companyId}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from('producao-fotos').upload(foto_path, foto);
        if (up.error) throw up.error;
      }
      const { error } = await supabase.rpc('register_raw_entry', {
        _company_id: companyId, _material_id: matId, _quantidade: Number(qtd.replace(',', '.')),
        _lote: lote, _procedencia: proc, _temperatura: num(temp) as number, _especificacao: espec,
        _numero_controle: ctrl, _boletim: boletim, _fop: fop, _observacoes: obs,
        _foto_path: foto_path as string, _custo_total: num(custo) ?? 0, _vencimento: (venc || null) as string,
      });
      if (error) throw error;
      toast.success('Entrada registrada' + (num(custo) ? ' e conta a pagar criada no Financeiro' : ''));
      setQtd(''); setLote(''); setProc(''); setTemp(''); setEspec(''); setCtrl(''); setBoletim(false);
      setFop(''); setObs(''); setCusto(''); setVenc(''); setFoto(null);
      load();
    } catch (err) { toast.error((err as Error).message); } finally { setSaving(false); }
  };

  const salvarProducao = async () => {
    if (!entryId || !prodId || !(Number(consumo) > 0)) { toast.error('Preencha lote, produto e quantidades'); return; }
    setSaving(true);
    const { error } = await supabase.rpc('register_production', {
      _entry_id: entryId, _produto_material_id: prodId, _quantidade_consumida: Number(consumo),
      _quantidade_produzida: Number(produzido) || 0, _lote_produto: loteProd, _observacoes: obsProd,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Produção registrada');
    setConsumo(''); setProduzido(''); setLoteProd(''); setObsProd(''); setEntryId('');
    load();
  };

  const verFoto = async (path: string) => {
    const { data, error } = await supabase.storage.from('producao-fotos').createSignedUrl(path, 300);
    if (error || !data) { toast.error('Não foi possível abrir a foto'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const MatSelect = ({ value, onChange, exclude }: { value: string; onChange: (v: string) => void; exclude?: string }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
      <SelectContent>
        {mats.filter((m) => m.id !== exclude).map((m) => (
          <SelectItem key={m.id} value={m.id}>{m.codigo} · {m.material} ({m.quantidade} {m.unidade})</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Factory className="w-6 h-6 text-primary" /> Produção</h1>
          <p className="text-muted-foreground text-sm">Entrada de matéria-prima → processamento → venda no PDV. Custos vão para o Financeiro.</p>
        </div>
        <Tabs defaultValue="entrada">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="entrada">Entrada de matéria-prima</TabsTrigger>
            <TabsTrigger value="producao">Processar</TabsTrigger>
            <TabsTrigger value="lotes">Lotes e rastreio</TabsTrigger>
          </TabsList>

          <TabsContent value="entrada">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><PackagePlus className="w-5 h-5" /> Nova entrada</CardTitle>
                <CardDescription className="flex items-center gap-1"><Clock className="w-4 h-4" /> Data e hora do lançamento: {now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2"><Label>Matéria-prima *</Label><MatSelect value={matId} onChange={setMatId} /></div>
                <div><Label>Quantidade *</Label><Input inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} /></div>
                <div><Label>Lote</Label><Input value={lote} onChange={(e) => setLote(e.target.value)} /></div>
                <div><Label>Procedência</Label><Input value={proc} onChange={(e) => setProc(e.target.value)} placeholder="Fornecedor / origem" /></div>
                <div><Label>Nº de controle</Label><Input value={ctrl} onChange={(e) => setCtrl(e.target.value)} placeholder="Automático se vazio" /></div>
                <div><Label>Temperatura (°C)</Label><Input inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} /></div>
                <div className="md:col-span-2"><Label>Outra especificação</Label><Input value={espec} onChange={(e) => setEspec(e.target.value)} placeholder="pH, umidade, peso..." /></div>
                <div className="flex items-center gap-3 pt-6"><Switch checked={boletim} onCheckedChange={setBoletim} id="bol" /><Label htmlFor="bol">Boletim: {boletim ? 'Sim' : 'Não'}</Label></div>
                <div><Label>FOP</Label><Input value={fop} onChange={(e) => setFop(e.target.value)} /></div>
                <div><Label>Custo total (R$)</Label><Input inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="Vai para contas a pagar" /></div>
                <div><Label>Vencimento do pagamento</Label><Input type="date" value={venc} onChange={(e) => setVenc(e.target.value)} /></div>
                <div className="md:col-span-2"><Label>Observações</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} /></div>
                <div><Label className="flex items-center gap-1"><Camera className="w-4 h-4" /> Foto (opcional)</Label>
                  <Input type="file" accept="image/*" capture="environment" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} /></div>
                <div className="md:col-span-3 flex justify-end"><Button onClick={salvarEntrada} disabled={saving}>Registrar entrada</Button></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="producao">
            <Card>
              <CardHeader>
                <CardTitle>Transformar em material processado</CardTitle>
                <CardDescription>Baixa do lote da matéria-prima e entrada do produto processado no estoque (pronto para venda no PDV).</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div><Label>Lote de matéria-prima *</Label>
                  <Select value={entryId} onValueChange={setEntryId}>
                    <SelectTrigger><SelectValue placeholder={abertos.length ? 'Selecione' : 'Nenhum lote com saldo'} /></SelectTrigger>
                    <SelectContent>
                      {abertos.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.numero_controle} · {matById[e.material_id]?.material} · lote {e.lote || '-'} (saldo {e.quantidade_restante})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select></div>
                <div><Label>Produto processado *</Label><MatSelect value={prodId} onChange={setProdId} exclude={selEntry?.material_id} /></div>
                <div><Label>Quantidade consumida *</Label><Input inputMode="decimal" value={consumo} onChange={(e) => setConsumo(e.target.value)} /></div>
                <div><Label>Quantidade produzida *</Label><Input inputMode="decimal" value={produzido} onChange={(e) => setProduzido(e.target.value)} /></div>
                <div><Label>Lote do produto</Label><Input value={loteProd} onChange={(e) => setLoteProd(e.target.value)} placeholder="Automático se vazio" /></div>
                <div><Label>Observações</Label><Input value={obsProd} onChange={(e) => setObsProd(e.target.value)} /></div>
                {Number(consumo) > 0 && (
                  <div className="md:col-span-2 flex gap-3 text-sm">
                    <Badge variant="secondary">Rendimento {rend.rendimento.toFixed(1)}%</Badge>
                    <Badge variant={rend.perda > 0 ? 'warning' as never : 'secondary'}>Perda {rend.perda} ({rend.perdaPct.toFixed(1)}%)</Badge>
                  </div>
                )}
                <div className="md:col-span-2 flex justify-end"><Button onClick={salvarProducao} disabled={saving}>Registrar produção</Button></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lotes" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Entradas de matéria-prima</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Data/hora</TableHead><TableHead>Controle</TableHead><TableHead>Material</TableHead><TableHead>Lote</TableHead>
                    <TableHead>Procedência</TableHead><TableHead>Temp.</TableHead><TableHead>Boletim</TableHead><TableHead>FOP</TableHead>
                    <TableHead>Qtd / saldo</TableHead><TableHead>Custo</TableHead><TableHead>Foto</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {entries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap">{fmtDT(e.created_at)}</TableCell>
                        <TableCell>{e.numero_controle}</TableCell>
                        <TableCell>{matById[e.material_id]?.material}</TableCell>
                        <TableCell>{e.lote || '-'}</TableCell>
                        <TableCell>{e.procedencia || '-'}</TableCell>
                        <TableCell>{e.temperatura != null ? `${e.temperatura} °C` : '-'}</TableCell>
                        <TableCell>{e.boletim ? 'Sim' : 'Não'}</TableCell>
                        <TableCell>{e.fop || '-'}</TableCell>
                        <TableCell>{e.quantidade} / {e.quantidade_restante}</TableCell>
                        <TableCell>{brl(Number(e.custo_total))}</TableCell>
                        <TableCell>{e.foto_path ? <Button size="sm" variant="outline" onClick={() => verFoto(e.foto_path!)}>Ver</Button> : '-'}</TableCell>
                      </TableRow>
                    ))}
                    {!entries.length && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">Nenhuma entrada ainda</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Produções (rastreio de lote)</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Data/hora</TableHead><TableHead>Lote produto</TableHead><TableHead>Produto</TableHead>
                    <TableHead>Origem (controle MP)</TableHead><TableHead>Consumido</TableHead><TableHead>Produzido</TableHead><TableHead>Rendimento</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {orders.map((o) => {
                      const e = entryById[o.entry_id];
                      return (
                        <TableRow key={o.id}>
                          <TableCell className="whitespace-nowrap">{fmtDT(o.created_at)}</TableCell>
                          <TableCell>{o.lote_produto}</TableCell>
                          <TableCell>{matById[o.produto_material_id]?.material}</TableCell>
                          <TableCell>{e?.numero_controle} · {e ? matById[e.material_id]?.material : ''} · lote {e?.lote || '-'}</TableCell>
                          <TableCell>{o.quantidade_consumida}</TableCell>
                          <TableCell>{o.quantidade_produzida}</TableCell>
                          <TableCell>{rendimento(Number(o.quantidade_consumida), Number(o.quantidade_produzida)).rendimento.toFixed(1)}%</TableCell>
                        </TableRow>
                      );
                    })}
                    {!orders.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma produção ainda</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
