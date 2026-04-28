import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { folhaService } from '@/services/folhaService';
import { PayrollConfig } from '@/lib/payrollCalc';
import { toast } from 'sonner';
import { MainLayout } from '@/components/MainLayout';

export default function ConfiguracaoFolha() {
  const { user } = useAuth();
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [cfg, setCfg] = useState<PayrollConfig>({
    inss_mode: 'auto', inss_manual_rate: 0,
    irrf_mode: 'auto', irrf_manual_rate: 0,
    vt_mode: 'percent', vt_value: 6,
    other_discounts: 0,
    inss_patronal_rate: 20, fgts_rate: 8, rat_rate: 2, sistema_s_rate: 5.8,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.companyId) return;
    folhaService.getConfig(user.companyId, competencia).then(setCfg);
  }, [user?.companyId, competencia]);

  const save = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      await folhaService.saveConfig(user.companyId, competencia, cfg);
      toast.success('Configuração salva');
    } catch (e: any) {
      toast.error('Erro ao salvar');
    } finally { setLoading(false); }
  };

  const set = <K extends keyof PayrollConfig>(k: K, v: PayrollConfig[K]) => setCfg({ ...cfg, [k]: v });

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Configuração da Folha</h1>
        <p className="text-muted-foreground">Defina regras de cálculo e encargos por competência</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Competência</CardTitle></CardHeader>
        <CardContent>
          <Input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} className="max-w-xs" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>INSS</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Modo</Label>
            <Select value={cfg.inss_mode} onValueChange={(v: any) => set('inss_mode', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automático (faixas progressivas 2025)</SelectItem>
                <SelectItem value="manual">Manual (% editável)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {cfg.inss_mode === 'manual' && (
            <div><Label>Alíquota manual (%)</Label><Input type="number" step="0.01" value={cfg.inss_manual_rate} onChange={e => set('inss_manual_rate', Number(e.target.value))} /></div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>IRRF</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Modo</Label>
            <Select value={cfg.irrf_mode} onValueChange={(v: any) => set('irrf_mode', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automático (com dedução por dependente)</SelectItem>
                <SelectItem value="manual">Manual (% editável)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {cfg.irrf_mode === 'manual' && (
            <div><Label>Alíquota manual (%)</Label><Input type="number" step="0.01" value={cfg.irrf_manual_rate} onChange={e => set('irrf_manual_rate', Number(e.target.value))} /></div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Vale Transporte</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Modo</Label>
            <Select value={cfg.vt_mode} onValueChange={(v: any) => set('vt_mode', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">% sobre o bruto</SelectItem>
                <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>{cfg.vt_mode === 'percent' ? '%' : 'Valor (R$)'}</Label><Input type="number" step="0.01" value={cfg.vt_value} onChange={e => set('vt_value', Number(e.target.value))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Encargos Patronais (%)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><Label>INSS Patronal</Label><Input type="number" step="0.01" value={cfg.inss_patronal_rate} onChange={e => set('inss_patronal_rate', Number(e.target.value))} /></div>
          <div><Label>FGTS</Label><Input type="number" step="0.01" value={cfg.fgts_rate} onChange={e => set('fgts_rate', Number(e.target.value))} /></div>
          <div><Label>RAT</Label><Input type="number" step="0.01" value={cfg.rat_rate} onChange={e => set('rat_rate', Number(e.target.value))} /></div>
          <div><Label>Sistema S</Label><Input type="number" step="0.01" value={cfg.sistema_s_rate} onChange={e => set('sistema_s_rate', Number(e.target.value))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Outros Descontos Padrão</CardTitle></CardHeader>
        <CardContent>
          <Input type="number" step="0.01" value={cfg.other_discounts} onChange={e => set('other_discounts', Number(e.target.value))} />
        </CardContent>
      </Card>

      <Button onClick={save} disabled={loading}>Salvar Configuração</Button>
    </div>
  );
}
