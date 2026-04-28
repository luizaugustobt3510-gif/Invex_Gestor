import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { folhaService, PayrollForecastRow } from '@/services/folhaService';
import { formatBRL } from '@/lib/payrollCalc';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/MainLayout';

export default function HistoricoFolha() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PayrollForecastRow[]>([]);
  const [empNames, setEmpNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user?.companyId) return;
    folhaService.getHistory(user.companyId).then(setRows);
    supabase.from('employees').select('id,nome').eq('company_id', user.companyId).then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach((e: any) => { map[e.id] = e.nome; });
      setEmpNames(map);
    });
  }, [user?.companyId]);

  const grouped = rows.reduce<Record<string, PayrollForecastRow[]>>((acc, r) => {
    (acc[r.competencia] ||= []).push(r);
    return acc;
  }, {});

  const competencias = Object.keys(grouped).sort().reverse();

  return (
    <MainLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Histórico de Folhas</h1>
        <p className="text-muted-foreground">Pré-folhas geradas anteriormente</p>
      </div>

      {competencias.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma folha gerada ainda.</CardContent></Card>
      )}

      {competencias.map(comp => {
        const list = grouped[comp];
        const total = list.reduce((s, r) => s + r.company_cost, 0);
        return (
          <Card key={comp}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Competência {comp}</span>
                <Badge>{formatBRL(total)} • {list.length} func.</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Funcionário</TableHead><TableHead className="text-right">Bruto</TableHead><TableHead className="text-right">Líquido</TableHead><TableHead className="text-right">Custo</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {list.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{empNames[r.employee_id] || r.employee_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-right">{formatBRL(r.gross_salary)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatBRL(r.net_salary)}</TableCell>
                      <TableCell className="text-right">{formatBRL(r.company_cost)}</TableCell>
                      <TableCell><Badge variant={r.status === 'gerado' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
    </MainLayout>
  );
}
