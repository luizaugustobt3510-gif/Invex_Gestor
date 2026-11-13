import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Search, Trash2, ShoppingCart, Check, UserRound, UserPlus, ChevronsUpDown, Layers } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { QuantityInput } from '@/components/QuantityInput';
import { formatQty, unitShort, isFractionalUnit } from '@/lib/units';
import { dbErrorMessage } from '@/lib/dbErrors';
import { getValidadeInfo } from '@/lib/validade';
import { useVendasCatalog, fmtDate, brl, type CatalogProduct, type Customer } from './useVendasCatalog';
import { CustomerFormDialog } from './CustomerFormDialog';
import { planOldestFirst, saldoSemLote, saleTotals, sortOldestFirst, CONSUMIDOR_NAO_IDENTIFICADO, type SaleLot } from './vendasCalc';

type LoteModo = 'auto' | 'manual' | 'sem_lote';
interface CartItem {
  key: string;
  product: CatalogProduct;
  quantidade: number;
  preco_unitario: number;
  loteModo: LoteModo;
  loteId: string | null;
  loteTexto: string;
}

const PAGAMENTOS: Record<string, string> = {
  dinheiro: 'Dinheiro', pix: 'Pix', cartao_credito: 'Cartão Crédito', cartao_debito: 'Cartão Débito', a_prazo: 'A prazo (Contas a Receber)',
};

const hojeMais = (dias: number) => {
  const d = new Date(); d.setDate(d.getDate() + dias);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
};

const PDV = () => {
  const { companyId, products, lotsByMaterial, customers, load } = useVendasCatalog();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [formaPagamento, setFormaPagamento] = useState('dinheiro');
  const [desconto, setDesconto] = useState(0);
  const [descontoTipo, setDescontoTipo] = useState<'valor' | 'percentual'>('valor');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [maisAntigo, setMaisAntigo] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [vencimento, setVencimento] = useState('');
  const [extraCustomers, setExtraCustomers] = useState<Customer[]>([]);
  const [params] = useSearchParams();
  const preAdded = useRef(false);

  const allCustomers = useMemo(() => {
    const m = new Map<string, Customer>();
    [...customers, ...extraCustomers].forEach((c) => m.set(c.id, c));
    return [...m.values()].filter((c) => c.ativo).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [customers, extraCustomers]);
  const customer = allCustomers.find((c) => c.id === customerId) ?? null;

  useEffect(() => {
    if (formaPagamento === 'a_prazo' && !customer) setFormaPagamento('dinheiro');
    if (customer) setVencimento(hojeMais(customer.prazo_pagamento_dias || 0));
  }, [customer, formaPagamento]);

  const lotsOf = (id: string): SaleLot[] => sortOldestFirst(lotsByMaterial[id] ?? []);

  // Produtos finais da Produção aparecem primeiro
  const filtered = products
    .filter((m) => m.material.toLowerCase().includes(searchTerm.toLowerCase()) || m.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => Number(b.tipo === 'produto_final') - Number(a.tipo === 'produto_final'));

  const emCarrinho = (id: string, exceptKey?: string) => cart.filter((c) => c.product.id === id && c.key !== exceptKey).reduce((s, c) => s + c.quantidade, 0);

  const addToCart = (p: CatalogProduct, qtd = 1) => {
    const livre = p.quantidade - emCarrinho(p.id);
    if (livre <= 0) { toast.error(p.quantidade <= 0 ? 'Produto sem estoque' : `Todo o estoque já está no carrinho (${formatQty(p.quantidade, p.unidade)})`); return; }
    const q = Math.min(qtd, livre);
    const lots = lotsOf(p.id);
    const existing = cart.find((c) => c.product.id === p.id && c.loteModo === (maisAntigo || !lots.length ? 'auto' : 'manual') && (!c.loteId || c.loteId === lots[0]?.id));
    if (existing) {
      setCart((prev) => prev.map((c) => (c.key === existing.key ? { ...c, quantidade: Math.round((c.quantidade + q) * 1000) / 1000 } : c)));
      return;
    }
    const modo: LoteModo = maisAntigo || !lots.length ? 'auto' : 'manual';
    setCart((prev) => [...prev, {
      key: `${p.id}-${Date.now()}`, product: p, quantidade: q, preco_unitario: p.preco,
      loteModo: modo, loteId: modo === 'manual' ? lots[0]?.id ?? null : null, loteTexto: '',
    }]);
  };

  const patch = (key: string, d: Partial<CartItem>) => setCart((prev) => prev.map((c) => (c.key === key ? { ...c, ...d } : c)));
  const removeFromCart = (key: string) => setCart((prev) => prev.filter((c) => c.key !== key));

  // Vindo do dashboard/Produção com ?material=: já coloca o produto no carrinho
  useEffect(() => {
    const id = params.get('material');
    if (!id || preAdded.current || products.length === 0) return;
    const m = products.find((x) => x.id === id);
    preAdded.current = true;
    if (m && m.quantidade > 0) addToCart(m);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, products]);

  const { subtotal, descontoValor, total } = saleTotals(cart, desconto, descontoTipo);

  const maxFor = (c: CartItem) => {
    const livre = c.product.quantidade - emCarrinho(c.product.id, c.key);
    if (c.loteModo === 'manual' && c.loteId) {
      const lot = lotsOf(c.product.id).find((l) => l.id === c.loteId);
      const usadoNoLote = cart.filter((x) => x.key !== c.key && x.loteModo === 'manual' && x.loteId === c.loteId).reduce((s, x) => s + x.quantidade, 0);
      if (lot) return Math.max(0, Math.min(livre, lot.restante - usadoNoLote));
    }
    return Math.max(0, livre);
  };

  const validar = (): string | null => {
    for (const c of cart) {
      if (!(c.quantidade > 0)) return `Quantidade inválida em ${c.product.material}`;
      if (!isFractionalUnit(c.product.unidade) && !Number.isInteger(c.quantidade)) return `${c.product.material} só aceita números inteiros`;
      if (c.quantidade > maxFor(c) + 1e-9) return `${c.product.material}: disponível ${formatQty(maxFor(c), c.product.unidade)}`;
      if (c.loteModo === 'manual' && !c.loteId) return `Escolha o lote de ${c.product.material}`;
    }
    if (formaPagamento === 'a_prazo' && !customer) return 'Venda a prazo precisa de um comprador identificado';
    return null;
  };

  const abrirConfirmacao = () => {
    const err = validar();
    if (err) { toast.error(err); return; }
    setShowConfirm(true);
  };

  const finalizeSale = async () => {
    if (cart.length === 0 || !companyId) return;
    setLoading(true);
    const items = cart.map((c) => {
      const lot = c.loteId ? lotsOf(c.product.id).find((l) => l.id === c.loteId) : null;
      return {
        material_id: c.product.id, quantidade: c.quantidade, preco_unitario: c.preco_unitario,
        lote_modo: c.loteModo, lote_ref_id: c.loteModo === 'manual' ? c.loteId : null,
        lote_ref_tipo: c.loteModo === 'manual' ? lot?.tipo ?? 'produto' : null,
        lote: c.loteModo === 'sem_lote' ? c.loteTexto.trim() : '',
      };
    });
    const { error } = await supabase.rpc('finalize_sale', {
      _company_id: companyId, _items: items, _forma_pagamento: formaPagamento, _desconto: desconto, _desconto_tipo: descontoTipo,
      _customer_id: customer?.id ?? undefined, _observacoes: '',
      _vencimento: formaPagamento === 'a_prazo' && vencimento ? vencimento : undefined,
    });
    setLoading(false);
    if (error) { toast.error(dbErrorMessage(error, 'Erro ao finalizar venda')); return; }
    toast.success(`Venda finalizada! Total: ${brl(total)}`, {
      description: formaPagamento === 'a_prazo' ? `Ficou em Contas a Receber para ${fmtDate(vencimento)}.` : undefined,
    });
    setCart([]); setDesconto(0); setShowConfirm(false); setCustomerId(null); setFormaPagamento('dinheiro');
    load();
  };

  const loteResumo = (p: CatalogProduct) => {
    const lots = lotsOf(p.id);
    if (!lots.length) return null;
    const l = lots[0];
    return { l, total: lots.length };
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">PDV - Ponto de Venda</h1>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Produtos */}
          <div className="xl:col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">Produtos</CardTitle>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Switch checked={maisAntigo} onCheckedChange={setMaisAntigo} aria-label="Vender do lote mais antigo" />
                    Vender do lote mais antigo primeiro
                  </label>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nome ou código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 text-base md:text-sm" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[560px] overflow-y-auto">
                  {filtered.map((m) => {
                    const r = loteResumo(m);
                    const val = r?.l.validade ? getValidadeInfo(r.l.validade) : null;
                    return (
                      <button key={m.id} onClick={() => addToCart(m)} disabled={m.quantidade <= 0}
                        className="p-3 border rounded-lg text-left hover:bg-accent transition-colors disabled:opacity-50 flex flex-col gap-0.5">
                        <p className="font-medium text-sm text-foreground truncate">{m.material}</p>
                        <div className="flex flex-wrap gap-1">
                          {m.tipo === 'produto_final' && <Badge variant="secondary" className="text-[10px]">Produzido</Badge>}
                          {m.tipo === 'materia_prima' && <Badge variant="outline" className="text-[10px]">Matéria-prima</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{m.codigo}</p>
                        {r && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Layers className="w-3 h-3" /> Lote {r.l.lote || '-'} · prod. {fmtDate(r.l.data_producao)}
                            {r.total > 1 && <span>(+{r.total - 1})</span>}
                          </p>
                        )}
                        {val && ['vencido', 'critico', 'atencao'].includes(val.status) && (
                          <p className="text-[11px] text-destructive">Validade {fmtDate(r!.l.validade)}</p>
                        )}
                        <div className="flex justify-between items-center mt-auto pt-1 gap-1">
                          <span className="text-sm font-semibold text-primary">{brl(m.preco)}<span className="text-xs font-normal text-muted-foreground">/{unitShort(m.unidade)}</span></span>
                          <Badge variant={m.quantidade > 0 ? 'default' : 'destructive'} className="text-xs">{formatQty(m.quantidade, m.unidade)}</Badge>
                        </div>
                      </button>
                    );
                  })}
                  {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">Nenhum produto encontrado</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Carrinho */}
          <div className="xl:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3 space-y-3">
                <CardTitle className="text-lg flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Carrinho ({cart.length})</CardTitle>
                <div className="space-y-1">
                  <Label className="text-xs">Comprador</Label>
                  <div className="flex gap-2">
                    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="flex-1 justify-between font-normal" aria-label="Escolher comprador">
                          <span className="flex items-center gap-2 truncate"><UserRound className="w-4 h-4 shrink-0" />{customer?.nome ?? CONSUMIDOR_NAO_IDENTIFICADO}</span>
                          <ChevronsUpDown className="w-4 h-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[320px]" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar comprador..." />
                          <CommandList>
                            <CommandEmpty>Nenhum comprador encontrado</CommandEmpty>
                            <CommandGroup>
                              <CommandItem value={CONSUMIDOR_NAO_IDENTIFICADO} onSelect={() => { setCustomerId(null); setPickerOpen(false); }}>
                                {CONSUMIDOR_NAO_IDENTIFICADO}
                              </CommandItem>
                              {allCustomers.map((c) => (
                                <CommandItem key={c.id} value={`${c.nome} ${c.documento ?? ''} ${c.id}`} onSelect={() => { setCustomerId(c.id); setPickerOpen(false); }}>
                                  <div className="flex flex-col">
                                    <span>{c.nome}</span>
                                    <span className="text-xs text-muted-foreground">{[c.documento, c.segmento, c.prazo_pagamento_dias ? `prazo ${c.prazo_pagamento_dias} dias` : ''].filter(Boolean).join(' · ')}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="icon" onClick={() => setNewCustomerOpen(true)} aria-label="Cadastrar comprador"><UserPlus className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Carrinho vazio</p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {cart.map((c) => {
                        const lots = lotsOf(c.product.id);
                        const plan = c.loteModo === 'auto' ? planOldestFirst(lots, c.quantidade) : null;
                        const semLote = saldoSemLote(c.product.quantidade, lots);
                        return (
                          <div key={c.key} className="p-2 border rounded-lg space-y-2">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{c.product.material}</p>
                                <p className="text-xs text-muted-foreground">{brl(c.preco_unitario)}/{unitShort(c.product.unidade)} · disponível {formatQty(maxFor(c), c.product.unidade)}</p>
                              </div>
                              <span className="text-sm font-semibold whitespace-nowrap">{brl(Math.round(c.quantidade * c.preco_unitario * 100) / 100)}</span>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(c.key)} aria-label="Remover"><Trash2 className="h-3 w-3" /></Button>
                            </div>
                            <QuantityInput value={c.quantidade} unidade={c.product.unidade} max={maxFor(c)}
                              onChange={(q) => patch(c.key, { quantidade: q })} onInvalid={(msg) => toast.error(msg)} label={`Quantidade de ${c.product.material}`} />
                            <div className="grid gap-1">
                              <Select
                                value={c.loteModo === 'manual' ? c.loteId ?? '' : c.loteModo}
                                onValueChange={(v) => {
                                  if (!v) return;
                                  if (v === 'auto' || v === 'sem_lote') patch(c.key, { loteModo: v, loteId: null });
                                  else patch(c.key, { loteModo: 'manual', loteId: v });
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs" aria-label="Lote"><SelectValue placeholder="Escolha o lote" /></SelectTrigger>
                                <SelectContent>
                                  {lots.length > 0 && <SelectItem value="auto">Automático · lote mais antigo primeiro</SelectItem>}
                                  {lots.map((l) => (
                                    <SelectItem key={l.id} value={l.id}>
                                      Lote {l.lote || '-'} · prod. {fmtDate(l.data_producao)}{l.validade ? ` · val. ${fmtDate(l.validade)}` : ''} · {formatQty(l.restante, c.product.unidade)}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="sem_lote">{lots.length ? `Sem lote (${formatQty(semLote, c.product.unidade)})` : 'Sem lote / digitar nº do lote'}</SelectItem>
                                  {!lots.length && <SelectItem value="auto" className="hidden">Sem lote</SelectItem>}
                                </SelectContent>
                              </Select>
                              {plan && plan.usados.length > 0 && (
                                <p className="text-[11px] text-muted-foreground">
                                  Sai de: {plan.usados.map((u) => `lote ${u.lot.lote || '-'} (${formatQty(u.qtd, c.product.unidade)}, prod. ${fmtDate(u.lot.data_producao)})`).join(', ')}
                                  {plan.semLote > 0 && ` + ${formatQty(plan.semLote, c.product.unidade)} sem lote`}
                                </p>
                              )}
                              {(c.loteModo === 'sem_lote' || (c.loteModo === 'auto' && !lots.length)) && (
                                <Input className="h-8 text-base md:text-xs" placeholder="Nº do lote (opcional)" value={c.loteTexto}
                                  onChange={(e) => patch(c.key, { loteTexto: e.target.value, loteModo: 'sem_lote' })} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Desconto</Label>
                          <Input type="number" min={0} inputMode="decimal" value={desconto} onChange={(e) => setDesconto(Number(e.target.value))} className="h-8 text-base md:text-sm" />
                        </div>
                        <div className="w-24">
                          <Label className="text-xs">Tipo</Label>
                          <Select value={descontoTipo} onValueChange={(v: 'valor' | 'percentual') => setDescontoTipo(v)}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="valor">R$</SelectItem>
                              <SelectItem value="percentual">%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Forma de Pagamento</Label>
                        <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="pix">Pix</SelectItem>
                            <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                            <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                            <SelectItem value="a_prazo" disabled={!customer}>A prazo {customer ? '(Contas a Receber)' : '(escolha um comprador)'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {formaPagamento === 'a_prazo' && (
                        <div>
                          <Label className="text-xs">Vencimento</Label>
                          <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className="h-8 text-base md:text-sm" />
                          {customer && customer.limite_credito > 0 && total > customer.limite_credito && (
                            <p className="text-xs text-destructive mt-1">Acima do limite de crédito do comprador ({brl(customer.limite_credito)}).</p>
                          )}
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{brl(subtotal)}</span></div>
                      {descontoValor > 0 && <div className="flex justify-between text-destructive"><span>Desconto</span><span>- {brl(descontoValor)}</span></div>}
                      <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">{brl(total)}</span></div>
                    </div>

                    <Button className="w-full" size="lg" onClick={abrirConfirmacao} disabled={loading}>
                      <Check className="w-4 h-4 mr-2" /> Finalizar Venda
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {companyId && (
        <CustomerFormDialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen} companyId={companyId} compact
          onSaved={(c) => { setExtraCustomers((p) => [...p, c]); setCustomerId(c.id); load(); }} />
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Venda</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1 text-sm">
                <p>Comprador: <strong>{customer?.nome ?? CONSUMIDOR_NAO_IDENTIFICADO}</strong></p>
                <ul className="list-disc pl-5">
                  {cart.map((c) => <li key={c.key}>{formatQty(c.quantidade, c.product.unidade)} de {c.product.material}</li>)}
                </ul>
                <p>Total: <strong>{brl(total)}</strong> · Pagamento: <strong>{PAGAMENTOS[formaPagamento]}</strong>
                  {formaPagamento === 'a_prazo' && <> · vence <strong>{fmtDate(vencimento)}</strong></>}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); finalizeSale(); }} disabled={loading}>{loading ? 'Processando...' : 'Confirmar'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default PDV;
