import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PackagePlus, Camera, Clock, Factory, PackageSearch } from 'lucide-react';
import { useProducaoData, fmtDT, fmtD, brl, parseNum } from '@/pages/producao/useProducaoData';
import { LiveClock } from '@/pages/producao/LiveClock';
import { dbErrorMessage } from '@/lib/dbErrors';

export default function EntradaMateriaPrima() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { companyId, mats, entries, matById, load } = useProducaoData();
  const [saving, setSaving] = useState(false);
  const [lastEntryId, setLastEntryId] = useState<string | null>(null);

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
  const [validade, setValidade] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoKey, setFotoKey] = useState(0);

  useEffect(() => {
    const pre = params.get('material');
    if (pre && mats.some((m) => m.id === pre)) setMatId(pre);
  }, [params, mats]);

  const materiasPrimas = useMemo(() => mats.filter((m) => m.tipo === 'materia_prima'), [mats]);
  const outros = useMemo(() => mats.filter((m) => m.tipo !== 'materia_prima'), [mats]);

  const salvar = async () => {
    const quantidade = parseNum(qtd);
    if (!companyId || !matId || !(quantidade && quantidade > 0)) { toast.error('Escolha a matéria-prima e a quantidade'); return; }
    setSaving(true);
    try {
      let foto_path: string | null = null;
      if (foto) {
        const ext = foto.name.split('.').pop() || 'jpg';
        foto_path = `${companyId}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from('producao-fotos').upload(foto_path, foto);
        if (up.error) throw up.error;
      }
      const { data, error } = await supabase.rpc('register_raw_entry', {
        _company_id: companyId, _material_id: matId, _quantidade: quantidade,
        _lote: lote, _procedencia: proc, _temperatura: parseNum(temp) as number, _especificacao: espec,
        _numero_controle: ctrl, _boletim: boletim, _fop: fop, _observacoes: obs,
        _foto_path: foto_path as string, _custo_total: parseNum(custo) ?? 0, _vencimento: (venc || null) as string,
        _validade: (validade || null) as string,
      });
      if (error) throw error;
      toast.success('Entrada registrada no estoque' + (parseNum(custo) ? ' e conta a pagar criada no Financeiro' : ''));
      setLastEntryId(data as string);
      setQtd(''); setLote(''); setProc(''); setTemp(''); setEspec(''); setCtrl(''); setBoletim(false);
      setFop(''); setObs(''); setCusto(''); setVenc(''); setValidade(''); setFoto(null); setFotoKey((k) => k + 1);
      load();
    } catch (err) { toast.error(dbErrorMessage(err as { message?: string }, 'Erro ao registrar entrada')); } finally { setSaving(false); }
  };

  const verFoto = async (path: string) => {
    const { data, error } = await supabase.storage.from('producao-fotos').createSignedUrl(path, 300);
    if (error || !data) { toast.error('Não foi possível abrir a foto'); return; }
    window.open(data.signedUrl, '_blank');
  };

  return (
    <MainLayout>
      <div className="space-y-4 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><PackagePlus className="w-6 h-6 text-primary" /> Entrada de matéria-prima</h1>
          <p className="text-muted-foreground text-sm">A quantidade entra no estoque, o lote fica disponível para a Produção e o custo vai para Contas a Pagar.</p>
        </div>

        {lastEntryId && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <p className="text-sm font-medium">Lote registrado. Quer processar agora?</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => navigate(`/producao/processar?entry=${lastEntryId}`)}><Factory className="w-4 h-4 mr-1" /> Processar este lote</Button>
                <Button size="sm" variant="outline" onClick={() => setLastEntryId(null)}>Depois</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Nova entrada</CardTitle>
            <CardDescription className="flex items-center gap-1"><Clock className="w-4 h-4" /> Data e hora do lançamento: <LiveClock /></CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2"><Label>Matéria-prima *</Label>
              <Select value={matId} onValueChange={(v) => v && setMatId(v)}>
                <SelectTrigger><SelectValue placeholder={mats.length ? 'Selecione' : 'Cadastre o material primeiro'} /></SelectTrigger>
                <SelectContent>
                  {materiasPrimas.length > 0 && (
                    <SelectGroup><SelectLabel>Matérias-primas</SelectLabel>
                      {materiasPrimas.map((m) => <SelectItem key={m.id} value={m.id}>{m.codigo} · {m.material} ({m.quantidade} {m.unidade})</SelectItem>)}
                    </SelectGroup>
                  )}
                  {outros.length > 0 && (
                    <SelectGroup><SelectLabel>Outros materiais (viram matéria-prima)</SelectLabel>
                      {outros.map((m) => <SelectItem key={m.id} value={m.id}>{m.codigo} · {m.material} ({m.quantidade} {m.unidade})</SelectItem>)}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              {matId && <p className="text-xs text-muted-foreground mt-1">Estoque atual: {matById[matId]?.quantidade} {matById[matId]?.unidade}</p>}
            </div>
            <div><Label>Quantidade *</Label><Input inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} /></div>
            <div><Label>Lote</Label><Input value={lote} onChange={(e) => setLote(e.target.value)} /></div>
            <div><Label>Procedência</Label><Input value={proc} onChange={(e) => setProc(e.target.value)} placeholder="Fornecedor / origem" /></div>
            <div><Label>Nº de controle</Label><Input value={ctrl} onChange={(e) => setCtrl(e.target.value)} placeholder="Automático se vazio" /></div>
            <div><Label>Temperatura (°C)</Label><Input inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} /></div>
            <div><Label>Validade do lote</Label><Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} /></div>
            <div><Label>Outra especificação</Label><Input value={espec} onChange={(e) => setEspec(e.target.value)} placeholder="pH, umidade, peso..." /></div>
            <div className="flex items-center gap-3 pt-6"><Switch checked={boletim} onCheckedChange={setBoletim} id="bol" /><Label htmlFor="bol">Boletim: {boletim ? 'Sim' : 'Não'}</Label></div>
            <div><Label>FOP</Label><Input value={fop} onChange={(e) => setFop(e.target.value)} /></div>
            <div><Label>Custo total (R$)</Label><Input inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="Vai para contas a pagar" /></div>
            <div><Label>Vencimento do pagamento</Label><Input type="date" value={venc} onChange={(e) => setVenc(e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Observações</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} /></div>
            <div><Label className="flex items-center gap-1"><Camera className="w-4 h-4" /> Foto (opcional)</Label>
              <Input key={fotoKey} type="file" accept="image/*" capture="environment" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} /></div>
            <div className="md:col-span-3 flex justify-end"><Button onClick={salvar} disabled={saving}>{saving ? 'Registrando...' : 'Registrar entrada'}</Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Últimas entradas</CardTitle>
            <Button size="sm" variant="outline" onClick={() => navigate('/producao/lotes')}><PackageSearch className="w-4 h-4 mr-1" /> Lotes e rastreio</Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data/hora</TableHead><TableHead>Controle</TableHead><TableHead>Material</TableHead><TableHead>Lote</TableHead>
                <TableHead>Procedência</TableHead><TableHead>Temp.</TableHead><TableHead>Validade</TableHead><TableHead>Qtd / saldo</TableHead><TableHead>Custo</TableHead><TableHead>Foto</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {entries.slice(0, 15).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">{fmtDT(e.created_at)}</TableCell>
                    <TableCell>{e.numero_controle}</TableCell>
                    <TableCell>{matById[e.material_id]?.material}</TableCell>
                    <TableCell>{e.lote || '-'}</TableCell>
                    <TableCell>{e.procedencia || '-'}</TableCell>
                    <TableCell>{e.temperatura != null ? `${e.temperatura} °C` : '-'}</TableCell>
                    <TableCell>{fmtD(e.validade)}</TableCell>
                    <TableCell>{e.quantidade} / {e.quantidade_restante > 0 ? e.quantidade_restante : <Badge variant="secondary">usado</Badge>}</TableCell>
                    <TableCell>{brl(e.custo_total)}</TableCell>
                    <TableCell>{e.foto_path ? <Button size="sm" variant="outline" onClick={() => verFoto(e.foto_path!)}>Ver</Button> : '-'}</TableCell>
                  </TableRow>
                ))}
                {!entries.length && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Nenhuma entrada ainda</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
