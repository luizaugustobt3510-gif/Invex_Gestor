import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, Settings, FileText, History, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { folhaService, PayrollForecastRow } from '@/services/folhaService';
import { formatBRL } from '@/lib/payrollCalc';

export default function DashboardFolha() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState<PayrollForecastRow[]>([]);
  const competencia = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (!user?.companyId) return;
    folhaService.getHistory(user.companyId).then(setHistory);
  }, [user?.companyId]);

  const monthRows = history.filter(r => r.competencia === competencia);
  const totalLiquido = monthRows.reduce((s, r) => s + r.net_salary, 0);
  const totalEncargos = monthRows.reduce((s, r) => s + r.encargos_patronais, 0);
  const totalCusto = monthRows.reduce((s, r) => s + r.company_cost, 0);
  const media = monthRows.length ? totalCusto / monthRows.length : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Folha de Pagamento</h1>
        <p className="text-muted-foreground">Simulação completa antes do fechamento oficial</p>
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <p className="text-sm text-amber-900">
            Este módulo gera <strong>simulações</strong> da folha de pagamento. A folha oficial deve ser validada pela contabilidade.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Líquido</p><p className="text-2xl font-bold">{formatBRL(totalLiquido)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Encargos</p><p className="text-2xl font-bold">{formatBRL(totalEncargos)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Custo Total Empresa</p><p className="text-2xl font-bold text-primary">{formatBRL(totalCusto)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Média por Funcionário</p><p className="text-2xl font-bold">{formatBRL(media)}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition" onClick={() => navigate('/folha/simulacao')}>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" />Nova Simulação</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Selecione funcionários e simule a folha do mês.</p></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition" onClick={() => navigate('/folha/configuracao')}>
          <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary" />Configuração</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">INSS, IRRF, vale-transporte e encargos patronais.</p></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition" onClick={() => navigate('/folha/historico')}>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-5 h-5 text-primary" />Histórico</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Folhas geradas anteriormente.</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
