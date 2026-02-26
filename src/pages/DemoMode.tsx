import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvexLogo } from '@/components/InvexLogo';
import { Package, AlertTriangle, ShieldCheck, Clock, LogOut, XCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const DEMO_DURATION = 5 * 60; // 5 minutes in seconds

const DEMO_ITEMS = [
  { codigo: '001', material: 'Luva Descartável P', unidade: 'CX', quantidade: 50, minimo: 20, maximo: 200, preco: 32.5, status: 'OK' },
  { codigo: '002', material: 'Máscara N95', unidade: 'UN', quantidade: 5, minimo: 30, maximo: 100, preco: 8.9, status: 'Abaixo do Mínimo' },
  { codigo: '003', material: 'Álcool 70%', unidade: 'LT', quantidade: 0, minimo: 10, maximo: 50, preco: 12.0, status: 'Zerado' },
  { codigo: '004', material: 'Seringa 10ml', unidade: 'UN', quantidade: 300, minimo: 100, maximo: 500, preco: 1.2, status: 'OK' },
  { codigo: '005', material: 'Gaze Estéril', unidade: 'PCT', quantidade: 80, minimo: 50, maximo: 300, preco: 5.5, status: 'OK' },
  { codigo: '006', material: 'Esparadrapo', unidade: 'RL', quantidade: 3, minimo: 10, maximo: 40, preco: 15.0, status: 'Abaixo do Mínimo' },
  { codigo: '007', material: 'Algodão 500g', unidade: 'PCT', quantidade: 25, minimo: 10, maximo: 60, preco: 18.0, status: 'OK' },
  { codigo: '008', material: 'Soro Fisiológico 500ml', unidade: 'UN', quantidade: 0, minimo: 20, maximo: 100, preco: 6.0, status: 'Zerado' },
  { codigo: '009', material: 'Cateter IV 20G', unidade: 'UN', quantidade: 150, minimo: 50, maximo: 300, preco: 3.5, status: 'OK' },
  { codigo: '010', material: 'Bisturi nº 15', unidade: 'UN', quantidade: 40, minimo: 20, maximo: 100, preco: 2.8, status: 'OK' },
  { codigo: '011', material: 'Fio de Sutura Nylon', unidade: 'UN', quantidade: 12, minimo: 15, maximo: 60, preco: 22.0, status: 'Abaixo do Mínimo' },
  { codigo: '012', material: 'Compressa Cirúrgica', unidade: 'PCT', quantidade: 60, minimo: 30, maximo: 150, preco: 9.0, status: 'OK' },
  { codigo: '013', material: 'Atadura Crepe 10cm', unidade: 'RL', quantidade: 90, minimo: 40, maximo: 200, preco: 4.0, status: 'OK' },
  { codigo: '014', material: 'Agulha Descartável 25x7', unidade: 'CX', quantidade: 0, minimo: 5, maximo: 30, preco: 28.0, status: 'Zerado' },
  { codigo: '015', material: 'Termômetro Digital', unidade: 'UN', quantidade: 8, minimo: 5, maximo: 20, preco: 45.0, status: 'OK' },
  { codigo: '016', material: 'Oxímetro de Pulso', unidade: 'UN', quantidade: 4, minimo: 3, maximo: 10, preco: 89.0, status: 'OK' },
  { codigo: '017', material: 'Clorexidina 2%', unidade: 'LT', quantidade: 7, minimo: 10, maximo: 30, preco: 35.0, status: 'Abaixo do Mínimo' },
  { codigo: '018', material: 'Lâmina Bisturi nº 23', unidade: 'CX', quantidade: 15, minimo: 10, maximo: 50, preco: 42.0, status: 'OK' },
  { codigo: '019', material: 'Equipo Macrogotas', unidade: 'UN', quantidade: 200, minimo: 80, maximo: 400, preco: 4.5, status: 'OK' },
  { codigo: '020', material: 'Fita Micropore', unidade: 'RL', quantidade: 30, minimo: 15, maximo: 80, preco: 7.5, status: 'OK' },
  { codigo: '021', material: 'Luva Estéril M', unidade: 'PAR', quantidade: 100, minimo: 50, maximo: 250, preco: 5.0, status: 'OK' },
  { codigo: '022', material: 'Máscara Cirúrgica', unidade: 'CX', quantidade: 2, minimo: 10, maximo: 50, preco: 25.0, status: 'Abaixo do Mínimo' },
  { codigo: '023', material: 'Scalp nº 21', unidade: 'UN', quantidade: 70, minimo: 30, maximo: 150, preco: 1.8, status: 'OK' },
  { codigo: '024', material: 'Povidine Tópico', unidade: 'LT', quantidade: 0, minimo: 5, maximo: 20, preco: 28.0, status: 'Zerado' },
  { codigo: '025', material: 'Água Destilada 1L', unidade: 'UN', quantidade: 45, minimo: 20, maximo: 100, preco: 8.0, status: 'OK' },
  { codigo: '026', material: 'Coletor Perfurocortante', unidade: 'UN', quantidade: 10, minimo: 5, maximo: 25, preco: 18.0, status: 'OK' },
  { codigo: '027', material: 'Sonda Nasogástrica nº 16', unidade: 'UN', quantidade: 20, minimo: 10, maximo: 50, preco: 6.5, status: 'OK' },
  { codigo: '028', material: 'Protetor Facial', unidade: 'UN', quantidade: 1, minimo: 5, maximo: 20, preco: 35.0, status: 'Abaixo do Mínimo' },
  { codigo: '029', material: 'Avental Descartável', unidade: 'UN', quantidade: 50, minimo: 30, maximo: 120, preco: 12.0, status: 'OK' },
  { codigo: '030', material: 'Touca Descartável', unidade: 'PCT', quantidade: 40, minimo: 20, maximo: 100, preco: 10.0, status: 'OK' },
  { codigo: '031', material: 'Propé Descartável', unidade: 'PAR', quantidade: 80, minimo: 40, maximo: 200, preco: 3.0, status: 'OK' },
  { codigo: '032', material: 'Detergente Enzimático', unidade: 'LT', quantidade: 3, minimo: 5, maximo: 15, preco: 55.0, status: 'Abaixo do Mínimo' },
  { codigo: '033', material: 'Saco de Lixo Branco 100L', unidade: 'PCT', quantidade: 20, minimo: 10, maximo: 50, preco: 22.0, status: 'OK' },
  { codigo: '034', material: 'Papel Toalha', unidade: 'PCT', quantidade: 35, minimo: 15, maximo: 80, preco: 8.0, status: 'OK' },
  { codigo: '035', material: 'Sabonete Líquido Antisséptico', unidade: 'LT', quantidade: 0, minimo: 5, maximo: 20, preco: 30.0, status: 'Zerado' },
];

const DemoMode = () => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(DEMO_DURATION);
  const [expired, setExpired] = useState(false);

  // Check if demo was already used
  useEffect(() => {
    const demoUsed = localStorage.getItem('invex_demo_used');
    if (demoUsed) {
      setExpired(true);
    }
  }, []);

  useEffect(() => {
    if (expired) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          localStorage.setItem('invex_demo_used', 'true');
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [expired]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleBlockedAction = useCallback(() => {
    toast.error('Modo demonstração — somente visualização.');
  }, []);

  const totalOk = DEMO_ITEMS.filter(i => i.status === 'OK').length;
  const totalAlerta = DEMO_ITEMS.filter(i => i.status === 'Abaixo do Mínimo').length;
  const totalCritico = DEMO_ITEMS.filter(i => i.status === 'Zerado').length;
  const totalValor = DEMO_ITEMS.reduce((s, i) => s + i.quantidade * i.preco, 0);

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
        <Card className="w-full max-w-md shadow-elevated text-center">
          <CardHeader className="space-y-4">
            <div className="flex justify-center"><InvexLogo size="lg" /></div>
            <CardTitle className="text-xl">Sessão Demo Encerrada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">Sua sessão de demonstração expirou. Crie uma conta para usar o Invex!</p>
            <Button className="w-full" onClick={() => navigate('/login')}>Voltar ao Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Header */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <InvexLogo size="sm" iconOnly />
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            Demo: {formatTime(timeLeft)}
          </Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate('/login')} className="gap-1">
          <LogOut className="w-4 h-4" /> Sair
        </Button>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Dashboard — Modo Demonstração</h1>
          <Badge variant="outline" className="text-xs">Somente Leitura</Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">OK</span>
              <div className="p-2 rounded-lg bg-emerald-500/10"><Package className="w-4 h-4 text-emerald-600" /></div>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalOk}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">Alerta</span>
              <div className="p-2 rounded-lg bg-warning/10"><AlertTriangle className="w-4 h-4 text-warning" /></div>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalAlerta}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">Críticos</span>
              <div className="p-2 rounded-lg bg-destructive/10"><XCircle className="w-4 h-4 text-destructive" /></div>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalCritico}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">Valor Total</span>
              <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="w-4 h-4 text-primary" /></div>
            </div>
            <p className="text-xl font-bold text-foreground">R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent></Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Materiais ({DEMO_ITEMS.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Mín</TableHead>
                    <TableHead className="text-right">Máx</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DEMO_ITEMS.map((item) => (
                    <TableRow key={item.codigo}>
                      <TableCell className="font-mono">{item.codigo}</TableCell>
                      <TableCell className="font-medium">{item.material}</TableCell>
                      <TableCell>{item.unidade}</TableCell>
                      <TableCell className="text-right font-bold">{item.quantidade}</TableCell>
                      <TableCell className="text-right">{item.minimo}</TableCell>
                      <TableCell className="text-right">{item.maximo}</TableCell>
                      <TableCell className="text-right">R$ {item.preco.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'Zerado' ? 'destructive' : item.status.includes('Abaixo') ? 'secondary' : 'default'}>
                          {item.status === 'Zerado' ? 'Crítico' : item.status === 'Abaixo do Mínimo' ? 'Alerta' : 'OK'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DemoMode;
