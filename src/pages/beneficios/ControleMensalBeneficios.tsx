import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Sparkles, AlertCircle } from 'lucide-react';
import { beneficiosService, BenefitMonthly, currentCompetencia, competenciaLabel, Benefit } from '@/services/beneficiosService';

interface Employee { id: string; nome: string; departamento: string | null; }

export default function ControleMensalBeneficios() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [competencia, setCompetencia] = useState(currentCompetencia());
  const [rows, setRows] = useState<BenefitMonthly[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const empMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const benMap = useMemo(() => new Map(benefits.map(b => [b.id, b])), [benefits]);

  const load = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    const [{ data: m }, { data: e }, { data: b }] = await Promise.all([
      beneficiosService.listMonthly(user.companyId, competencia),
      supabase.from('employees').select('id, nome, departamento').eq('company_id', user.companyId),
      beneficiosService.listBenefits(user.companyId),
    ]);
    setRows((m as BenefitMonthly[]) || []);
    setEmployees((e as Employee[]) || []);
    setBenefits((b as Benefit[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.companyId, competencia]);

  const handleGenerate = async () => {
    if (!user?.companyId) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.id) { toast({ title: 'Sessão inválida', variant: 'destructive' }); return; }
    if (!confirm(`Gerar competência ${competenciaLabel(competencia)}?\nCriará lançamentos financeiros individuais por funcionário e benefício.`)) return;
    setGenerating(true);
    try {
      const { generated } = await beneficiosService.generateCompetencia(user.companyId, authUser.id, competencia);
      toast({ title: 'Competência gerada', description: `${generated} registro(s) processado(s).` });
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao gerar', description: msg, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const totals = rows.reduce(
    (acc, r) => ({
      company: acc.company + Number(r.company_cost),
      employee: acc.employee + Number(r.employee_cost),
      net: acc.net + Number(r.net_cost),
    }),
    { company: 0, employee: 0, net: 0 }
  );

  return (
    <MainLayout>
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="w-6 h-6 text-primary" /> Controle Mensal de Benefícios</h1>
          <p className="text-sm text-muted-foreground">Gere e visualize os custos mensais por competência</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Competência</label>
            <Input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} className="w-44" />
          </div>
          <Button onClick={handleGenerate} disabled={generating}>
            <Sparkles className="w-4 h-4 mr-2" />{generating ? 'Gerando...' : `Gerar ${competenciaLabel(competencia)}`}
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Custo Empresa</p><p className="text-2xl font-bold">R$ {totals.company.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Desconto Funcionários</p><p className="text-2xl font-bold">R$ {totals.employee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Custo Líquido</p><p className="text-2xl font-bold text-primary">R$ {totals.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Benefício</TableHead>
                  <TableHead className="text-right">Custo Empresa</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead className="text-right">Custo Líquido</TableHead>
                  <TableHead>Lançamentos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Nenhum registro nesta competência. Clique em "Gerar" para criar.
                  </TableCell></TableRow>
                ) : rows.map(r => {
                  const emp = empMap.get(r.employee_id);
                  const ben = benMap.get(r.benefit_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{emp?.nome || '—'}</TableCell>
                      <TableCell>{ben?.name || '—'}</TableCell>
                      <TableCell className="text-right">R$ {Number(r.company_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">R$ {Number(r.employee_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-semibold">R$ {Number(r.net_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {r.financial_entry_id && <Badge variant="outline" className="text-xs">Despesa ✓</Badge>}
                          {r.financial_discount_id && <Badge variant="outline" className="text-xs">Desconto ✓</Badge>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
