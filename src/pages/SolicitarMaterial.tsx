import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList, Send, Search, Check, ChevronsUpDown, Package, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MaterialOption {
  id: string;
  codigo: string;
  material: string;
  unidade: string | null;
  quantidade: number | null;
}

interface CartItem {
  material: MaterialOption;
  quantidade: number;
  obs: string;
}

const SolicitarMaterial = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [setores, setSetores] = useState<Array<{ id: string; nome: string }>>([]);
  const [materiais, setMateriais] = useState<MaterialOption[]>([]);

  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialOption | null>(null);
  const [setor, setSetor] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [obs, setObs] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoadingData(true);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('company_id')
          .eq('user_id', authUser.id)
          .not('company_id', 'is', null)
          .limit(1)
          .single();

        if (!roleData?.company_id) return;
        setCompanyId(roleData.company_id);

        const [setoresRes, matsRes] = await Promise.all([
          supabase.from('sectors').select('id, nome').eq('company_id', roleData.company_id).order('nome'),
          supabase
            .from('materials')
            .select('id, codigo, material, unidade, quantidade')
            .eq('company_id', roleData.company_id)
            .order('material'),
        ]);
        setSetores(setoresRes.data || []);
        setMateriais((matsRes.data || []) as MaterialOption[]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  const selectedLabel = useMemo(() => {
    if (!selectedMaterial) return '';
    return `${selectedMaterial.codigo} — ${selectedMaterial.material}`;
  }, [selectedMaterial]);

  const addToCart = () => {
    if (!selectedMaterial || !quantidade) {
      toast({ title: 'Preencha material e quantidade', variant: 'destructive' });
      return;
    }
    const qtd = Number(quantidade);
    if (!qtd || qtd <= 0) {
      toast({ title: 'Quantidade inválida', variant: 'destructive' });
      return;
    }
    if (cart.some(c => c.material.id === selectedMaterial.id)) {
      toast({ title: 'Material já adicionado', description: 'Remova ou ajuste na lista abaixo.', variant: 'destructive' });
      return;
    }
    setCart(prev => [...prev, { material: selectedMaterial, quantidade: qtd, obs }]);
    setSelectedMaterial(null);
    setQuantidade('');
    setObs('');
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(c => c.material.id !== id));
  };

  const handleSubmit = async () => {
    if (!setor) {
      toast({ title: 'Selecione o setor solicitante', variant: 'destructive' });
      return;
    }
    if (cart.length === 0) {
      toast({ title: 'Adicione ao menos um material', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !companyId) throw new Error('Não autenticado');

      const selectedSetor = setores.find(s => s.id === setor);

      const rows = cart.map(item => ({
        company_id: companyId,
        user_id: authUser.id,
        setor: selectedSetor?.nome || setor,
        codigo: item.material.codigo,
        material: item.material.material,
        quantidade: item.quantidade,
        obs: item.obs || '',
      }));

      const { error } = await supabase.from('material_requests').insert(rows);
      if (error) throw error;

      toast({
        title: 'Solicitação enviada!',
        description: `${cart.length} ${cart.length === 1 ? 'item enviado' : 'itens enviados'} para ${selectedSetor?.nome}.`,
      });
      setCart([]);
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Erro ao enviar solicitação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Solicitar Materiais
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Adicione vários materiais à lista e envie tudo de uma vez para a logística.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Setor solicitante *</Label>
            <Select value={setor} onValueChange={setSetor}>
              <SelectTrigger>
                <SelectValue placeholder={loadingData ? 'Carregando...' : setores.length === 0 ? 'Nenhum setor cadastrado' : 'Selecione o setor'} />
              </SelectTrigger>
              <SelectContent>
                {setores.length === 0 ? (
                  <SelectItem value="_empty" disabled>Nenhum setor cadastrado</SelectItem>
                ) : (
                  setores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Plus className="w-4 h-4" />
              Adicionar material à lista
            </div>

            <div className="space-y-2">
              <Label>Material</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between font-normal h-11"
                    disabled={loadingData}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Search className="w-4 h-4 shrink-0 opacity-60" />
                      {selectedMaterial ? (
                        <span className="truncate">{selectedLabel}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {loadingData ? 'Carregando catálogo...' : 'Buscar por código ou nome...'}
                        </span>
                      )}
                    </span>
                    <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command
                    filter={(value, search) => {
                      const q = search.toLowerCase().trim();
                      if (!q) return 1;
                      return value.includes(q) ? 1 : 0;
                    }}
                  >
                    <CommandInput placeholder="Digite código ou nome do material..." />
                    <CommandList>
                      <CommandEmpty>
                        {materiais.length === 0
                          ? 'Nenhum material cadastrado. Solicite ao almoxarifado.'
                          : 'Nenhum material encontrado.'}
                      </CommandEmpty>
                      <CommandGroup heading={`${materiais.length} materiais no catálogo`}>
                        {materiais.map((m) => {
                          const value = `${m.codigo} ${m.material}`.toLowerCase();
                          const inCart = cart.some(c => c.material.id === m.id);
                          return (
                            <CommandItem
                              key={m.id}
                              value={value}
                              disabled={inCart}
                              onSelect={() => {
                                setSelectedMaterial(m);
                                setOpenCombobox(false);
                              }}
                              className="flex items-start gap-2 py-2"
                            >
                              <Check
                                className={cn(
                                  'mt-1 w-4 h-4 shrink-0',
                                  selectedMaterial?.id === m.id ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="font-mono text-[10px]">
                                    {m.codigo}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Estoque: {m.quantidade ?? 0} {m.unidade || ''}
                                  </span>
                                  {inCart && <Badge variant="outline" className="text-[10px]">na lista</Badge>}
                                </div>
                                <div className="text-sm truncate">{m.material}</div>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="0"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="obs">Observação (opcional)</Label>
                <Input
                  id="obs"
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Ex.: urgência, paciente..."
                  className="h-11"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={addToCart}
              disabled={!selectedMaterial || !quantidade}
              className="w-full h-11 gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar à lista
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShoppingCart className="w-4 h-4" />
                Lista de solicitação ({cart.length})
              </div>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                  Limpar
                </Button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhum material adicionado ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.material.id} className="rounded-md border bg-card p-3 flex items-center gap-3">
                    <Package className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px]">{item.material.codigo}</Badge>
                        <span className="font-medium">{item.quantidade} {item.material.unidade || ''}</span>
                      </div>
                      <div className="truncate">{item.material.material}</div>
                      {item.obs && <div className="text-xs text-muted-foreground truncate">Obs: {item.obs}</div>}
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFromCart(item.material.id)}
                      aria-label="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            className="w-full gap-2 h-11"
            disabled={loading || loadingData || cart.length === 0 || !setor}
          >
            <Send className="w-4 h-4" />
            {loading ? 'Enviando...' : `Enviar Solicitação${cart.length > 0 ? ` (${cart.length})` : ''}`}
          </Button>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default SolicitarMaterial;
