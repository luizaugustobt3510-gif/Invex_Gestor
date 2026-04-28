import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { folhaService, Employee, PayrollEvent, PayrollForecastRow } from '@/services/folhaService';
import { formatBRL } from '@/lib/payrollCalc';
import { toast } from 'sonner';
import { AlertTriangle, Calculator, FileText, Printer, Search } from 'lucide-react';
import { MainLayout } from '@/components/MainLayout';

type Step = 1 | 2 | 3 | 4;

interface IndividualAdj {
  bonus: number;
  faltas: number;
  outros: number;
  pensao: number;
  pensaoIsPercent: boolean;
  dependents: number;
  vtEnabled: boolean;
}

const emptyAdj = (): IndividualAdj => ({
  bonus: 0, faltas: 0, outros: 0, pensao: 0, pensaoIsPercent: false, dependents: 0, vtEnabled: true,
});

export default function SimulacaoFolha() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filterSetor, setFilterSetor] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('ativo');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adjustments, setAdjustments] = useState<Record<string, IndividualAdj>>({});
  const [forecast, setForecast] = useState<PayrollForecastRow[]>([]);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [holerite, setHolerite] = useState<PayrollForecastRow | null>(null);

  useEffect(() => {
    if (!user?.companyId) return;
    folhaService.getEmployees(user.companyId).then(setEmployees);
  }, [user?.companyId]);

  const setores = useMemo(() => Array.from(new Set(employees.map(e => e.departamento).filter(Boolean))) as string[], [employees]);

  const filtered = employees.filter(e => {
    if (filterStatus !== 'todos' && e.status !== filterStatus) return false;
    if (filterSetor !== 'todos' && e.departamento !== filterSetor) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      if (!e.nome.toLowerCase().includes(q) && !(e.cargo || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const toggleAll = (on: boolean) => {
    if (on) setSelected(new Set(filtered.map(e => e.id)));
    else setSelected(new Set());
  };

  const toggleOne = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const goSimulate = async () => {
    if (!user?.companyId || selected.size === 0) {
      toast.error('Selecione ao menos um funcionário');
      return;
    }
    setLoading(true);
    try {
      // Salvar ajustes individuais como events
      for (const id of Array.from(selected)) {
        const adj = adjustments[id] || emptyAdj();
        const events: Omit<PayrollEvent, 'id'>[] = [];
        if (adj.bonus) events.push({ employee_id: id, competencia, type: 'bonus', description: 'Bônus', value: adj.bonus });
        if (adj.faltas) events.push({ employee_id: id, competencia, type: 'falta', description: 'Faltas', value: adj.faltas });
        if (adj.outros) events.push({ employee_id: id, competencia, type: 'desconto', description: 'Outros descontos', value: adj.outros });
        if (adj.pensao) events.push({ employee_id: id, competencia, type: 'pensao', description: 'Pensão', value: adj.pensao, is_percent: adj.pensaoIsPercent });
        if (adj.dependents) events.push({ employee_id: id, competencia, type: 'dependentes', description: 'Dependentes', value: adj.dependents });
        if (!adj.vtEnabled) events.push({ employee_id: id, competencia, type: 'vt', description: 'VT desabilitado', value: 0 });
        await folhaService.saveEvents(user.companyId, competencia, id, events);
      }
      const result = await folhaService.simulate(user.companyId, competencia, Array.from(selected));
      setForecast(result);
      setStep(3);
    } catch (e: any) {
      toast.error('Erro ao simular: ' + e.message);
    } finally { setLoading(false); }
  };

  const printPayroll = () => {
    if (forecast.length === 0) {
      toast.error('Nenhum funcionário simulado');
      return;
    }
    const win = window.open('', '_blank');
    if (!win) { toast.error('Pop-up bloqueado pelo navegador'); return; }
    const escapeHtml = (s: any) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const fmt = (n: number) => formatBRL(n);
    const rowsHtml = forecast.map(r => {
      const emp = empMap.get(r.employee_id);
      return `<tr>
        <td>${escapeHtml(emp?.nome)}</td>
        <td>${escapeHtml(emp?.cargo || '-')}</td>
        <td style="text-align:right">${fmt(r.base_salary)}</td>
        <td style="text-align:right">${fmt(r.bonus_total)}</td>
        <td style="text-align:right">${fmt(r.gross_salary)}</td>
        <td style="text-align:right">${fmt(r.inss_value)}</td>
        <td style="text-align:right">${fmt(r.irrf_value)}</td>
        <td style="text-align:right">${fmt(r.vt_value)}</td>
        <td style="text-align:right">${fmt(r.total_discounts)}</td>
        <td style="text-align:right;font-weight:600">${fmt(r.net_salary)}</td>
        <td style="text-align:right">${fmt(r.company_cost)}</td>
      </tr>`;
    }).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"/>
      <title>Folha de Pagamento ${escapeHtml(competencia)}</title>
      <style>
        body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 4px} .meta{color:#555;font-size:12px;margin-bottom:16px}
        .totals{display:flex;gap:16px;margin:12px 0;font-size:12px}
        .totals div{padding:8px 12px;background:#f4f4f5;border-radius:6px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{border-bottom:1px solid #ddd;padding:6px 8px;vertical-align:top}
        th{background:#f4f4f5;text-align:left;font-weight:600}
        tr:nth-child(even) td{background:#fafafa}
        .footer{margin-top:16px;font-size:11px;color:#777;text-align:right}
        .warn{margin-top:12px;font-size:11px;color:#92400e;background:#fef3c7;padding:8px;border-radius:6px}
        @media print{body{padding:12px}}
      </style></head><body>
      <h1>Folha de Pagamento — Simulação</h1>
      <div class="meta">Competência ${escapeHtml(competencia)} · Gerado em ${escapeHtml(new Date().toLocaleString('pt-BR'))} · ${forecast.length} funcionário(s)</div>
      <div class="totals">
        <div><strong>Bruto:</strong> ${fmt(totals.bruto)}</div>
        <div><strong>Líquido:</strong> ${fmt(totals.liquido)}</div>
        <div><strong>Encargos:</strong> ${fmt(totals.encargos)}</div>
        <div><strong>Custo Empresa:</strong> ${fmt(totals.custo)}</div>
      </div>
      <table>
        <thead><tr>
          <th>Funcionário</th><th>Cargo</th>
          <th style="text-align:right">Base</th><th style="text-align:right">Bônus</th>
          <th style="text-align:right">Bruto</th><th style="text-align:right">INSS</th>
          <th style="text-align:right">IRRF</th><th style="text-align:right">VT</th>
          <th style="text-align:right">Descontos</th><th style="text-align:right">Líquido</th>
          <th style="text-align:right">Custo Emp.</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="warn">⚙️ Módulo em desenvolvimento — valores ilustrativos. Integração com o Financeiro será feita posteriormente.</div>
      <div class="footer">Invex</div>
      <script>window.onload=()=>{window.print();}<\/script>
      </body></html>`;
    win.document.write(html);
    win.document.close();
    setStep(4);
  };

  const totals = useMemo(() => ({
    liquido: forecast.reduce((s, r) => s + r.net_salary, 0),
    bruto: forecast.reduce((s, r) => s + r.gross_salary, 0),
    encargos: forecast.reduce((s, r) => s + r.encargos_patronais, 0),
    custo: forecast.reduce((s, r) => s + r.company_cost, 0),
  }), [forecast]);

  const empMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  // Alertas inteligentes
  const alerts = useMemo(() => {
    const list: { emp: string; msg: string; severity: 'high' | 'medium' }[] = [];
    forecast.forEach(r => {
      const emp = empMap.get(r.employee_id);
      if (!emp) return;
      if (r.net_salary < 0) list.push({ emp: emp.nome, msg: 'Salário líquido negativo', severity: 'high' });
      if (r.total_discounts > r.gross_salary * 0.5) list.push({ emp: emp.nome, msg: 'Descontos > 50% do bruto', severity: 'medium' });
      if (!emp.salario || emp.salario <= 0) list.push({ emp: emp.nome, msg: 'Sem salário cadastrado', severity: 'high' });
    });
    return list;
  }, [forecast, empMap]);

  return (
    <MainLayout>
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
          <p className="text-xs text-amber-900">
            ⚙️ Módulo em desenvolvimento — funcionalidades e cálculos podem mudar nas próximas versões.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Simulação da Folha</h1>
          <p className="text-muted-foreground">Wizard em etapas para gerar a pré-folha</p>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{n}</div>
          ))}
        </div>
      </div>

      {/* Step 1: Seleção */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>1. Selecione Funcionários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Competência</Label>
                <Input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} />
              </div>
              <div>
                <Label>Setor</Label>
                <Select value={filterSetor} onValueChange={setFilterSetor}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="afastado">Afastado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={(v) => toggleAll(!!v)} />
              <span className="text-sm">Selecionar todos visíveis ({filtered.length})</span>
              <Badge variant="secondary" className="ml-auto">{selected.size} selecionados</Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow><TableHead></TableHead><TableHead>Nome</TableHead><TableHead>Cargo</TableHead><TableHead>Setor</TableHead><TableHead className="text-right">Salário</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(e => (
                  <TableRow key={e.id} className={selected.has(e.id) ? 'bg-primary/5' : ''}>
                    <TableCell><Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggleOne(e.id)} /></TableCell>
                    <TableCell>{e.nome}</TableCell>
                    <TableCell>{e.cargo}</TableCell>
                    <TableCell>{e.departamento || '-'}</TableCell>
                    <TableCell className="text-right">{formatBRL(e.salario)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={selected.size === 0}>Próximo: Ajustes</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Ajustes */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Ajustes Individuais</CardTitle>
            <p className="text-sm text-muted-foreground">Clique em um funcionário para adicionar bônus, descontos, faltas, pensão e dependentes.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader><TableRow><TableHead>Funcionário</TableHead><TableHead>Bônus</TableHead><TableHead>Faltas</TableHead><TableHead>Pensão</TableHead><TableHead>Dependentes</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {Array.from(selected).map(id => {
                  const emp = empMap.get(id);
                  const adj = adjustments[id] || emptyAdj();
                  if (!emp) return null;
                  return (
                    <TableRow key={id}>
                      <TableCell>{emp.nome}</TableCell>
                      <TableCell>{formatBRL(adj.bonus)}</TableCell>
                      <TableCell>{formatBRL(adj.faltas)}</TableCell>
                      <TableCell>{adj.pensaoIsPercent ? `${adj.pensao}%` : formatBRL(adj.pensao)}</TableCell>
                      <TableCell>{adj.dependents}</TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => setEditingEmp(emp)}>Editar</Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={goSimulate} disabled={loading}><Calculator className="w-4 h-4 mr-2" />Simular Folha</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Resumo + Holerites */}
      {step === 3 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Bruto</p><p className="text-xl font-bold">{formatBRL(totals.bruto)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Líquido</p><p className="text-xl font-bold">{formatBRL(totals.liquido)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Encargos</p><p className="text-xl font-bold">{formatBRL(totals.encargos)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Custo Empresa</p><p className="text-xl font-bold text-primary">{formatBRL(totals.custo)}</p></CardContent></Card>
          </div>

          {alerts.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader><CardTitle className="text-amber-900 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Alertas ({alerts.length})</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {alerts.map((a, i) => (
                  <div key={i} className={a.severity === 'high' ? 'text-red-700' : 'text-amber-800'}>• <strong>{a.emp}:</strong> {a.msg}</div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Pré-visualização</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Funcionário</TableHead><TableHead className="text-right">Bruto</TableHead><TableHead className="text-right">INSS</TableHead><TableHead className="text-right">IRRF</TableHead><TableHead className="text-right">Descontos</TableHead><TableHead className="text-right">Líquido</TableHead><TableHead className="text-right">Custo Emp.</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {forecast.map(r => {
                    const emp = empMap.get(r.employee_id);
                    return (
                      <TableRow key={r.employee_id}>
                        <TableCell>{emp?.nome}</TableCell>
                        <TableCell className="text-right">{formatBRL(r.gross_salary)}</TableCell>
                        <TableCell className="text-right">{formatBRL(r.inss_value)}</TableCell>
                        <TableCell className="text-right">{formatBRL(r.irrf_value)}</TableCell>
                        <TableCell className="text-right">{formatBRL(r.total_discounts)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatBRL(r.net_salary)}</TableCell>
                        <TableCell className="text-right">{formatBRL(r.company_cost)}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={() => setHolerite(r)}><FileText className="w-4 h-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
            <Button onClick={printPayroll} disabled={loading}>
              <Printer className="w-4 h-4 mr-2" />Gerar PDF / Imprimir Folha
            </Button>
          </div>
        </>
      )}

      {/* Step 4: Confirmado */}
      {step === 4 && (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Printer className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Folha pronta para impressão!</h2>
            <p className="text-muted-foreground">Competência {competencia} • {forecast.length} funcionários • Custo total {formatBRL(totals.custo)}</p>
            <p className="text-sm text-muted-foreground">Use a janela aberta para salvar como PDF ou imprimir. A integração com o Financeiro será feita em uma versão futura.</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={printPayroll}>Reabrir impressão</Button>
              <Button onClick={() => { setStep(1); setSelected(new Set()); setForecast([]); setAdjustments({}); }}>Nova Simulação</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sheet de ajuste individual */}
      <Sheet open={!!editingEmp} onOpenChange={(o) => !o && setEditingEmp(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>{editingEmp?.nome}</SheetTitle></SheetHeader>
          {editingEmp && (() => {
            const adj = adjustments[editingEmp.id] || emptyAdj();
            const update = (patch: Partial<IndividualAdj>) => setAdjustments({ ...adjustments, [editingEmp.id]: { ...adj, ...patch } });
            return (
              <div className="space-y-4 mt-4">
                <div><Label>Bônus / Bonificação (R$)</Label><Input type="number" step="0.01" value={adj.bonus} onChange={e => update({ bonus: Number(e.target.value) })} /></div>
                <div><Label>Faltas (R$ a descontar)</Label><Input type="number" step="0.01" value={adj.faltas} onChange={e => update({ faltas: Number(e.target.value) })} /></div>
                <div><Label>Outros descontos (R$)</Label><Input type="number" step="0.01" value={adj.outros} onChange={e => update({ outros: Number(e.target.value) })} /></div>
                <div className="flex items-center justify-between">
                  <Label>Pensão em %?</Label>
                  <Switch checked={adj.pensaoIsPercent} onCheckedChange={(v) => update({ pensaoIsPercent: v })} />
                </div>
                <div><Label>Pensão alimentícia ({adj.pensaoIsPercent ? '%' : 'R$'})</Label><Input type="number" step="0.01" value={adj.pensao} onChange={e => update({ pensao: Number(e.target.value) })} /></div>
                <div><Label>Nº de dependentes (IRRF)</Label><Input type="number" min="0" value={adj.dependents} onChange={e => update({ dependents: Number(e.target.value) })} /></div>
                <div className="flex items-center justify-between"><Label>Vale-transporte ativo</Label><Switch checked={adj.vtEnabled} onCheckedChange={(v) => update({ vtEnabled: v })} /></div>
                <Button className="w-full" onClick={() => setEditingEmp(null)}>Concluir</Button>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Holerite */}
      <Sheet open={!!holerite} onOpenChange={(o) => !o && setHolerite(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Holerite Simulado</SheetTitle></SheetHeader>
          {holerite && (() => {
            const emp = empMap.get(holerite.employee_id);
            return (
              <div className="space-y-4 mt-4">
                <div className="border-b pb-2">
                  <p className="font-semibold">{emp?.nome}</p>
                  <p className="text-sm text-muted-foreground">{emp?.cargo} • {competencia}</p>
                </div>
                <Row label="Salário base" value={holerite.base_salary} />
                <Row label="Bônus" value={holerite.bonus_total} />
                <Row label="Faltas" value={-holerite.faltas_value} />
                <Row label="Salário bruto" value={holerite.gross_salary} bold />
                <div className="border-t pt-2 text-sm font-semibold text-muted-foreground">Descontos</div>
                <Row label="INSS" value={-holerite.inss_value} />
                <Row label="IRRF" value={-holerite.irrf_value} />
                <Row label="Vale-transporte" value={-holerite.vt_value} />
                <Row label="Pensão" value={-holerite.pensao_value} />
                <Row label="Outros" value={-holerite.other_discounts} />
                <Row label="Benefícios (desc.)" value={-holerite.benefits_employee} />
                <Row label="Total descontos" value={-holerite.total_discounts} bold />
                <div className="border-t pt-2">
                  <Row label="SALÁRIO LÍQUIDO" value={holerite.net_salary} bold large />
                </div>
                <div className="border-t pt-2 text-sm text-muted-foreground">
                  <Row label="Encargos patronais" value={holerite.encargos_patronais} />
                  <Row label="Custo total empresa" value={holerite.company_cost} bold />
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
    </MainLayout>
  );
}

function Row({ label, value, bold, large }: { label: string; value: number; bold?: boolean; large?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''} ${large ? 'text-lg text-primary' : 'text-sm'}`}>
      <span>{label}</span><span>{formatBRL(value)}</span>
    </div>
  );
}
