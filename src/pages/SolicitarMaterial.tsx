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
import { ClipboardList, Send, Search, Check, ChevronsUpDown, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MaterialOption {
  id: string;
  codigo: string;
  material: string;
  unidade: string | null;
  quantidade: number | null;
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
  const [formData, setFormData] = useState({
    setor: '',
    quantidade: '',
    obs: '',
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.setor || !selectedMaterial || !formData.quantidade) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione o setor, o material e informe a quantidade.',
        variant: 'destructive',
      });
      return;
    }

    const qtd = Number(formData.quantidade);
    if (!qtd || qtd <= 0) {
      toast({ title: 'Quantidade inválida', description: 'Informe uma quantidade maior que zero.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !companyId) throw new Error('Não autenticado');

      const selectedSetor = setores.find(s => s.id === formData.setor);

      const { error } = await supabase.from('material_requests').insert({
        company_id: companyId,
        user_id: authUser.id,
        setor: selectedSetor?.nome || formData.setor,
        codigo: selectedMaterial.codigo,
        material: selectedMaterial.material,
        quantidade: qtd,
        obs: formData.obs || '',
      });

      if (error) throw error;

      toast({
        title: 'Solicitação enviada!',
        description: `${qtd} × ${selectedMaterial.material} solicitado para ${selectedSetor?.nome}.`,
      });
      setFormData({ setor: formData.setor, quantidade: '', obs: '' });
      setSelectedMaterial(null);
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
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Solicitar Materiais
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Busque no catálogo da empresa e envie a solicitação. A logística irá aprovar e entregar ao setor.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Setor solicitante *</Label>
              <Select value={formData.setor} onValueChange={(v) => setFormData(prev => ({ ...prev, setor: v }))}>
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

            <div className="space-y-2">
              <Label>Material *</Label>
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
                      // value = `${codigo}||${material}` (lowercased in CommandItem)
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
                          return (
                            <CommandItem
                              key={m.id}
                              value={value}
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

              {selectedMaterial && (
                <div className="rounded-md border bg-muted/40 p-3 flex items-center gap-3">
                  <Package className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="font-medium truncate">{selectedMaterial.material}</div>
                    <div className="text-xs text-muted-foreground">
                      Código {selectedMaterial.codigo} · Unidade {selectedMaterial.unidade || '—'} · Estoque atual{' '}
                      {selectedMaterial.quantidade ?? 0}
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedMaterial(null)}>
                    Trocar
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                min="1"
                inputMode="numeric"
                value={formData.quantidade}
                onChange={(e) => setFormData(prev => ({ ...prev, quantidade: e.target.value }))}
                placeholder="0"
                className="h-11"
              />
              {selectedMaterial && selectedMaterial.unidade && (
                <p className="text-xs text-muted-foreground">Unidade: {selectedMaterial.unidade}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs">Observação</Label>
              <Textarea
                id="obs"
                value={formData.obs}
                onChange={(e) => setFormData(prev => ({ ...prev, obs: e.target.value }))}
                placeholder="Motivo, urgência, paciente, etc. (opcional)"
              />
            </div>

            <Button type="submit" className="w-full gap-2 h-11" disabled={loading || loadingData}>
              <Send className="w-4 h-4" />
              {loading ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default SolicitarMaterial;
