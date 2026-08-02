import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Link2, Unlink, Landmark, Trash2 } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const ConciliacaoBancaria = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [accountId, setAccountId] = useState('');
  const [start, setStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [end, setEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const [accOpen, setAccOpen] = useState(false);
  const [accForm, setAccForm] = useState({ nome: '', banco: '', agencia: '', conta: '', tipo: 'corrente', saldo_inicial: '' });

  const [txOpen, setTxOpen] = useState(false);
  const [txForm, setTxForm] = useState({ data: format(new Date(), 'yyyy-MM-dd'), descricao: '', valor: '', tipo: 'credito', documento: '' });

  const [matchTx, setMatchTx] = useState<any | null>(null);

  const load = async () => {
    if (!user?.companyId) return;
    const [{ data: ac }, { data: tx }, { data: en }] = await Promise.all([
      supabase.from('bank_accounts').select('*').eq('company_id', user.companyId).order('nome'),
      supabase.from('bank_transactions').select('*').eq('company_id', user.companyId).gte('data', start).lte('data', end).order('data'),
      supabase.from('financial_entries').select('*').eq('company_id', user.companyId).neq('status', 'cancelado').gte('data', start).lte('data', end),
    ]);
    setAccounts(ac || []);
    setTransactions(tx || []);
    setEntries(en || []);
    if (!accountId && ac && ac.length) setAccountId(ac[0].id);
  };

  useEffect(() => { load(); }, [user?.companyId, start, end]);

  const txs = useMemo(() => transactions.filter(t => !accountId || t.bank_account_id === accountId), [transactions, accountId]);
  const conciliadas = txs.filter(t => t.conciliado);
  const pendentes = txs.filter(t => !t.conciliado);

  const account = accounts.find(a => a.id === accountId);
  const saldo = useMemo(() => {
    const base = Number(account?.saldo_inicial || 0);
    return base + txs.reduce((s, t) => s + (t.tipo === 'credito' ? Number(t.valor) : -Number(t.valor)), 0);
  }, [txs, account]);

  const saveAccount = async () => {
    if (!accForm.nome.trim()) return toast({ title: 'Informe o nome da conta', variant: 'destructive' });
    const { error } = await supabase.from('bank_accounts').insert({
      company_id: user!.companyId!,
      nome: accForm.nome, banco: accForm.banco || null, agencia: accForm.agencia || null,
      conta: accForm.conta || null, tipo: accForm.tipo, saldo_inicial: Number(accForm.saldo_inicial || 0),
    });
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: 'Conta bancária criada!' });
    setAccOpen(false);
    setAccForm({ nome: '', banco: '', agencia: '', conta: '', tipo: 'corrente', saldo_inicial: '' });
    load();
  };

  const saveTx = async () => {
    if (!accountId) return toast({ title: 'Cadastre/selecione uma conta bancária', variant: 'destructive' });
    if (!txForm.descricao || !txForm.valor) return toast({ title: 'Preencha descrição e valor', variant: 'destructive' });
    const { error } = await supabase.from('bank_transactions').insert({
      company_id: user!.companyId!, bank_account_id: accountId,
      data: txForm.data, descricao: txForm.descricao, valor: Number(txForm.valor),
      tipo: txForm.tipo, documento: txForm.documento || null,
    });
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: 'Movimento bancário registrado!' });
    setTxOpen(false);
    setTxForm({ data: format(new Date(), 'yyyy-MM-dd'), descricao: '', valor: '', tipo: 'credito', documento: '' });
    load();
  };

  const conciliar = async (tx: any, entryId: string) => {
    const { error } = await supabase.from('bank_transactions').update({ conciliado: true, financial_entry_id: entryId }).eq('id', tx.id);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    await supabase.from('financial_entries').update({ conciliado: true }).eq('id', entryId);
    toast({ title: 'Conciliado!' });
    setMatchTx(null);
    load();
  };

  const desconciliar = async (tx: any) => {
    await supabase.from('bank_transactions').update({ conciliado: false, financial_entry_id: null }).eq('id', tx.id);
    if (tx.financial_entry_id) await supabase.from('financial_entries').update({ conciliado: false }).eq('id', tx.financial_entry_id);
    toast({ title: 'Conciliação desfeita' });
    load();
  };

  const removeTx = async (id: string) => {
    await supabase.from('bank_transactions').delete().eq('id', id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const candidates = useMemo(() => {
    if (!matchTx) return [];
    const wanted = matchTx.tipo === 'credito' ? 'receita' : 'despesa';
    return entries
      .filter(e => e.tipo === wanted && !e.conciliado)
      .sort((a, b) => Math.abs(Number(a.valor) - Number(matchTx.valor)) - Math.abs(Number(b.valor) - Number(matchTx.valor)))
      .slice(0, 20);
  }, [matchTx, entries]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Conciliação Bancária</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setAccOpen(true)}><Landmark className="w-4 h-4" /> Nova Conta</Button>
            <Button size="sm" className="gap-2" onClick={() => setTxOpen(true)}><Plus className="w-4 h-4" /> Movimento Bancário</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Label>Conta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}{a.banco ? ` — ${a.banco}` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>De</Label><Input type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
            <div><Label>Até</Label><Input type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Saldo da conta</p><p className={`text-xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(saldo)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Créditos</p><p className="text-xl font-bold text-green-600">{fmt(txs.filter(t => t.tipo === 'credito').reduce((s, t) => s + Number(t.valor), 0))}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Débitos</p><p className="text-xl font-bold text-red-600">{fmt(txs.filter(t => t.tipo === 'debito').reduce((s, t) => s + Number(t.valor), 0))}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pendentes de conciliação</p><p className="text-xl font-bold text-orange-600">{pendentes.length}</p><p className="text-xs text-muted-foreground">{conciliadas.length} conciliado(s)</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Extrato bancário</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 md:hidden">
              {txs.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum movimento no período</p>}
              {txs.map(t => (
                <div key={t.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{t.descricao}</p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(t.data), 'dd/MM/yyyy')}</p>
                    </div>
                    <p className={`font-bold whitespace-nowrap ${t.tipo === 'credito' ? 'text-green-600' : 'text-red-600'}`}>{fmt(Number(t.valor))}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {t.conciliado ? <Badge className="bg-green-600 text-white">Conciliado</Badge> : <Badge variant="outline">Pendente</Badge>}
                    {t.conciliado
                      ? <Button size="sm" variant="ghost" className="gap-1" onClick={() => desconciliar(t)}><Unlink className="w-3 h-3" /> Desfazer</Button>
                      : <Button size="sm" variant="outline" className="gap-1" onClick={() => setMatchTx(t)}><Link2 className="w-3 h-3" /> Conciliar</Button>}
                  </div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txs.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum movimento no período</TableCell></TableRow>
                  ) : txs.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{format(parseISO(t.data), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-medium max-w-[240px] truncate">{t.descricao}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.documento || '—'}</TableCell>
                      <TableCell><Badge variant={t.tipo === 'credito' ? 'default' : 'secondary'}>{t.tipo === 'credito' ? 'Crédito' : 'Débito'}</Badge></TableCell>
                      <TableCell className={t.tipo === 'credito' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{fmt(Number(t.valor))}</TableCell>
                      <TableCell>{t.conciliado ? <Badge className="bg-green-600 text-white">Conciliado</Badge> : <Badge variant="outline">Pendente</Badge>}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {t.conciliado
                          ? <Button size="sm" variant="ghost" className="gap-1" onClick={() => desconciliar(t)}><Unlink className="w-3 h-3" /> Desfazer</Button>
                          : <Button size="sm" variant="outline" className="gap-1" onClick={() => setMatchTx(t)}><Link2 className="w-3 h-3" /> Conciliar</Button>}
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeTx(t.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NOVA CONTA */}
      <Dialog open={accOpen} onOpenChange={setAccOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Conta Bancária</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={accForm.nome} onChange={e => setAccForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Banco</Label><Input value={accForm.banco} onChange={e => setAccForm(p => ({ ...p, banco: e.target.value }))} /></div>
              <div><Label>Tipo</Label>
                <Select value={accForm.tipo} onValueChange={v => setAccForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Conta Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                    <SelectItem value="caixa">Caixa</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Agência</Label><Input value={accForm.agencia} onChange={e => setAccForm(p => ({ ...p, agencia: e.target.value }))} /></div>
              <div><Label>Conta</Label><Input value={accForm.conta} onChange={e => setAccForm(p => ({ ...p, conta: e.target.value }))} /></div>
            </div>
            <div><Label>Saldo inicial (R$)</Label><Input type="number" inputMode="decimal" value={accForm.saldo_inicial} onChange={e => setAccForm(p => ({ ...p, saldo_inicial: e.target.value }))} /></div>
            <Button className="w-full" onClick={saveAccount}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* NOVO MOVIMENTO */}
      <Dialog open={txOpen} onOpenChange={setTxOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Movimento Bancário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={txForm.data} onChange={e => setTxForm(p => ({ ...p, data: e.target.value }))} /></div>
              <div><Label>Valor (R$) *</Label><Input type="number" inputMode="decimal" value={txForm.valor} onChange={e => setTxForm(p => ({ ...p, valor: e.target.value }))} /></div>
            </div>
            <div><Label>Descrição *</Label><Input value={txForm.descricao} onChange={e => setTxForm(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label>
                <Select value={txForm.tipo} onValueChange={v => setTxForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="credito">Crédito (entrada)</SelectItem><SelectItem value="debito">Débito (saída)</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Documento</Label><Input value={txForm.documento} onChange={e => setTxForm(p => ({ ...p, documento: e.target.value }))} /></div>
            </div>
            <Button className="w-full" onClick={saveTx}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CONCILIAR */}
      <Dialog open={!!matchTx} onOpenChange={() => setMatchTx(null)}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Conciliar movimento</DialogTitle></DialogHeader>
          {matchTx && (
            <div className="space-y-3">
              <div className="rounded-lg border p-3">
                <p className="font-medium">{matchTx.descricao}</p>
                <p className="text-sm text-muted-foreground">{format(parseISO(matchTx.data), 'dd/MM/yyyy')} · {fmt(Number(matchTx.valor))} · {matchTx.tipo === 'credito' ? 'Crédito' : 'Débito'}</p>
              </div>
              <p className="text-sm font-medium">Lançamentos compatíveis</p>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {candidates.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum lançamento disponível no período</p>}
                {candidates.map(e => (
                  <button key={e.id} onClick={() => conciliar(matchTx, e.id)} className="w-full text-left rounded-md border px-3 py-2 hover:bg-accent transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm">{e.descricao}</span>
                      <span className={`text-sm font-medium ${e.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>{fmt(Number(e.valor))}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{format(parseISO(e.data), 'dd/MM/yyyy')}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ConciliacaoBancaria;
