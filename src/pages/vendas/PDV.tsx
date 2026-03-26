import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Minus, Trash2, ShoppingCart, Check, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Material {
  id: string;
  codigo: string;
  material: string;
  quantidade: number;
  preco: number;
  unidade: string;
}

interface CartItem {
  material: Material;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

const PDV = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [formaPagamento, setFormaPagamento] = useState('dinheiro');
  const [desconto, setDesconto] = useState(0);
  const [descontoTipo, setDescontoTipo] = useState<'valor' | 'percentual'>('valor');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (user?.companyId) fetchMaterials();
  }, [user?.companyId]);

  const fetchMaterials = async () => {
    const { data } = await supabase
      .from('materials')
      .select('id, codigo, material, quantidade, preco, unidade')
      .eq('company_id', user!.companyId!)
      .order('material');
    if (data) setMaterials(data);
  };

  const filteredMaterials = materials.filter(m =>
    m.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (material: Material) => {
    const existing = cart.find(c => c.material.id === material.id);
    if (existing) {
      if (existing.quantidade + 1 > material.quantidade) {
        toast({ title: 'Estoque insuficiente', description: `Disponível: ${material.quantidade} ${material.unidade}`, variant: 'destructive' });
        return;
      }
      setCart(cart.map(c =>
        c.material.id === material.id
          ? { ...c, quantidade: c.quantidade + 1, subtotal: (c.quantidade + 1) * c.preco_unitario }
          : c
      ));
    } else {
      if (material.quantidade <= 0) {
        toast({ title: 'Estoque zerado', description: 'Este produto não possui estoque disponível.', variant: 'destructive' });
        return;
      }
      setCart([...cart, { material, quantidade: 1, preco_unitario: material.preco, subtotal: material.preco }]);
    }
  };

  const updateQuantity = (materialId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.material.id !== materialId) return c;
      const newQty = c.quantidade + delta;
      if (newQty <= 0) return c;
      if (newQty > c.material.quantidade) {
        toast({ title: 'Estoque insuficiente', variant: 'destructive' });
        return c;
      }
      return { ...c, quantidade: newQty, subtotal: newQty * c.preco_unitario };
    }));
  };

  const removeFromCart = (materialId: string) => {
    setCart(prev => prev.filter(c => c.material.id !== materialId));
  };

  const subtotal = cart.reduce((acc, c) => acc + c.subtotal, 0);
  const descontoValor = descontoTipo === 'percentual' ? (subtotal * desconto) / 100 : desconto;
  const total = Math.max(0, subtotal - descontoValor);

  const finalizeSale = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId || !user?.companyId) throw new Error('Usuário não autenticado');

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          company_id: user.companyId,
          user_id: userId,
          valor_total: total,
          desconto: descontoValor,
          desconto_tipo: descontoTipo,
          forma_pagamento: formaPagamento,
          status: 'finalizada',
        })
        .select()
        .single();

      if (saleError || !sale) throw saleError;

      // Insert sale items
      const items = cart.map(c => ({
        sale_id: sale.id,
        company_id: user.companyId!,
        material_id: c.material.id,
        quantidade: c.quantidade,
        preco_unitario: c.preco_unitario,
        subtotal: c.subtotal,
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(items);
      if (itemsError) throw itemsError;

      // Update stock (decrease quantities)
      for (const c of cart) {
        const newQty = c.material.quantidade - c.quantidade;
        const { error: stockError } = await supabase
          .from('materials')
          .update({ quantidade: newQty })
          .eq('id', c.material.id);
        if (stockError) throw stockError;

        // Record stock movement
        await supabase.from('stock_movements').insert({
          company_id: user.companyId!,
          material_id: c.material.id,
          quantidade: c.quantidade,
          tipo: 'saida',
          user_id: userId,
          obs: `Venda #${sale.id.slice(0, 8)}`,
        });
      }

      // Create financial entry
      await supabase.from('financial_entries').insert({
        company_id: user.companyId!,
        user_id: userId,
        tipo: 'receita',
        descricao: `Venda #${sale.id.slice(0, 8)} - ${cart.length} item(ns)`,
        valor: total,
        data: new Date().toISOString().split('T')[0],
        status: 'pago',
        data_pagamento: new Date().toISOString().split('T')[0],
        forma_pagamento: formaPagamento,
        origem: 'vendas',
        origem_id: sale.id,
      });

      toast({ title: 'Venda finalizada!', description: `Total: R$ ${total.toFixed(2)}` });
      setCart([]);
      setDesconto(0);
      setShowConfirm(false);
      fetchMaterials(); // refresh stock
    } catch (err: any) {
      toast({ title: 'Erro ao finalizar venda', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">PDV - Ponto de Venda</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Product search */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Produtos</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                  {filteredMaterials.map(m => (
                    <button
                      key={m.id}
                      onClick={() => addToCart(m)}
                      className="p-3 border rounded-lg text-left hover:bg-accent transition-colors disabled:opacity-50"
                      disabled={m.quantidade <= 0}
                    >
                      <p className="font-medium text-sm text-foreground truncate">{m.material}</p>
                      <p className="text-xs text-muted-foreground">{m.codigo}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm font-semibold text-primary">R$ {m.preco.toFixed(2)}</span>
                        <Badge variant={m.quantidade > 0 ? 'default' : 'destructive'} className="text-xs">
                          {m.quantidade} {m.unidade}
                        </Badge>
                      </div>
                    </button>
                  ))}
                  {filteredMaterials.length === 0 && (
                    <p className="col-span-full text-center text-muted-foreground py-8">Nenhum produto encontrado</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cart */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Carrinho ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Carrinho vazio</p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto">
                      {cart.map(c => (
                        <div key={c.material.id} className="flex items-center gap-2 p-2 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.material.material}</p>
                            <p className="text-xs text-muted-foreground">R$ {c.preco_unitario.toFixed(2)} × {c.quantidade}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(c.material.id, -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-semibold w-6 text-center">{c.quantidade}</span>
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(c.material.id, 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(c.material.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-sm font-semibold w-20 text-right">R$ {c.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Desconto</Label>
                          <Input
                            type="number"
                            min={0}
                            value={desconto}
                            onChange={(e) => setDesconto(Number(e.target.value))}
                            className="h-8"
                          />
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
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
                      {descontoValor > 0 && <div className="flex justify-between text-destructive"><span>Desconto</span><span>- R$ {descontoValor.toFixed(2)}</span></div>}
                      <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">R$ {total.toFixed(2)}</span></div>
                    </div>

                    <Button className="w-full" size="lg" onClick={() => setShowConfirm(true)} disabled={loading}>
                      <Check className="w-4 h-4 mr-2" />
                      Finalizar Venda
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Venda</AlertDialogTitle>
            <AlertDialogDescription>
              {cart.length} item(ns) — Total: <strong>R$ {total.toFixed(2)}</strong><br />
              Pagamento: <strong>{formaPagamento}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={finalizeSale} disabled={loading}>
              {loading ? 'Processando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default PDV;
