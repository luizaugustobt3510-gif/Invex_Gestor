import { useState, useEffect, useRef, useCallback } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, Camera, Send, ArrowLeft, Package } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface FoundMaterial {
  id: string;
  codigo: string;
  material: string;
  unidade: string;
  quantidade: number;
  localizacao: string;
  preco: number;
}

const QRScanner = () => {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [material, setMaterial] = useState<FoundMaterial | null>(null);
  const [tipo, setTipo] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [quantidade, setQuantidade] = useState('');
  const [obs, setObs] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'qr-reader';

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  const lookupMaterial = async (code: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .not('company_id', 'is', null)
        .limit(1)
        .single();

      if (!roleData?.company_id) throw new Error('Empresa não encontrada');

      // Try lookup by ID first, then by codigo
      let query = supabase
        .from('materials')
        .select('id, codigo, material, unidade, quantidade, localizacao, preco')
        .eq('company_id', roleData.company_id);

      // Try as UUID first
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(code)) {
        query = query.eq('id', code);
      } else {
        query = query.eq('codigo', code);
      }

      const { data, error } = await query.limit(1).single();
      if (error || !data) {
        toast({ title: 'Produto não encontrado', description: `Código: ${code}`, variant: 'destructive' });
        return;
      }

      setMaterial({
        id: data.id,
        codigo: data.codigo,
        material: data.material,
        unidade: data.unidade,
        quantidade: Number(data.quantidade),
        localizacao: data.localizacao || '',
        preco: Number(data.preco),
      });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Erro ao buscar produto.', variant: 'destructive' });
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setMaterial(null);

    // Wait for DOM element
    await new Promise(r => setTimeout(r, 300));

    try {
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopScanner();
          await lookupMaterial(decodedText.trim());
        },
        () => { /* ignore errors during scanning */ }
      );
    } catch (err: any) {
      setScanning(false);
      toast({
        title: 'Câmera indisponível',
        description: 'Verifique a permissão de câmera ou use o campo de código manual.',
        variant: 'destructive',
      });
    }
  };

  const handleManualSearch = async () => {
    if (!manualCode.trim()) return;
    await lookupMaterial(manualCode.trim());
    setManualCode('');
  };

  const handleConfirm = async () => {
    if (!material || !quantidade) {
      toast({ title: 'Informe a quantidade', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .not('company_id', 'is', null)
        .limit(1)
        .single();

      if (!roleData?.company_id) throw new Error('Empresa não encontrada');

      const qty = Number(quantidade);
      let newQty: number;

      if (tipo === 'entrada') {
        newQty = material.quantidade + qty;
      } else if (tipo === 'saida') {
        newQty = material.quantidade - qty;
        if (newQty < 0) {
          toast({ title: 'Estoque insuficiente', description: `Estoque atual: ${material.quantidade}`, variant: 'destructive' });
          setLoading(false);
          return;
        }
      } else {
        // ajuste
        newQty = qty;
      }

      // Update material
      await supabase.from('materials').update({ quantidade: newQty }).eq('id', material.id);

      // Log movement
      await supabase.from('stock_movements').insert({
        company_id: roleData.company_id,
        material_id: material.id,
        quantidade: tipo === 'ajuste' ? Math.abs(newQty - material.quantidade) : qty,
        tipo: tipo === 'ajuste' ? (newQty >= material.quantidade ? 'entrada' : 'saida') : tipo,
        obs: obs || `${tipo === 'ajuste' ? 'Ajuste/Inventário' : tipo === 'entrada' ? 'Entrada' : 'Saída'} via QR Code`,
        user_id: user.id,
      });

      toast({ title: 'Estoque atualizado com sucesso!', description: `${material.material}: ${material.quantidade} → ${newQty}` });

      setMaterial(prev => prev ? { ...prev, quantidade: newQty } : null);
      setQuantidade('');
      setObs('');
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Erro ao atualizar.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto space-y-4">
        {!material ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Escanear QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {scanning ? (
                <div className="space-y-4">
                  <div id={scannerDivId} className="w-full rounded-lg overflow-hidden" />
                  <p className="text-sm text-center text-muted-foreground animate-pulse">Lendo código…</p>
                  <Button variant="outline" className="w-full" onClick={stopScanner}>Cancelar</Button>
                </div>
              ) : (
                <Button onClick={startScanner} className="w-full gap-2" size="lg">
                  <Camera className="w-5 h-5" />
                  Abrir Câmera
                </Button>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou digite o código</span></div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Código do produto..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                />
                <Button onClick={handleManualSearch} variant="outline">Buscar</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Movimentação
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setMaterial(null)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product info */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">{material.material}</p>
                    <p className="text-sm text-muted-foreground font-mono">{material.codigo}</p>
                  </div>
                  <Badge variant="outline" className="text-lg">{material.quantidade} {material.unidade}</Badge>
                </div>
                {material.localizacao && (
                  <p className="text-sm text-muted-foreground">Localização: {material.localizacao}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tipo de Movimento *</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="ajuste">Ajuste / Inventário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  min="0"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder={tipo === 'ajuste' ? 'Nova quantidade total' : '0'}
                />
                {tipo === 'ajuste' && <p className="text-xs text-muted-foreground">No ajuste, a quantidade informada substituirá o estoque atual.</p>}
              </div>

              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Ex: Contagem inventário, Uso em exame..."
                />
              </div>

              <Button onClick={handleConfirm} className="w-full gap-2" disabled={loading}>
                <Send className="w-5 h-5" />
                {loading ? 'Processando...' : 'Confirmar Movimentação'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default QRScanner;
