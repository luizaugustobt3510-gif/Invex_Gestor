import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Users, Clock } from 'lucide-react';

interface Insight {
  icon: React.ReactNode;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
}

interface InsightsRHProps {
  employees: any[];
  terminations?: any[];
  certificates?: any[];
  trainings?: any[];
  asos?: any[];
  vacations?: any[];
}

const typeColors = {
  info: 'text-primary',
  warning: 'text-amber-600',
  success: 'text-emerald-600',
  danger: 'text-destructive',
};

const typeBg = {
  info: 'bg-primary/5 border-primary/20',
  warning: 'bg-amber-500/5 border-amber-500/20',
  success: 'bg-emerald-500/5 border-emerald-500/20',
  danger: 'bg-destructive/5 border-destructive/20',
};

export const InsightsRH = ({ employees, terminations = [], certificates = [], trainings = [], asos = [], vacations = [] }: InsightsRHProps) => {
  const insights: Insight[] = [];

  const ativos = employees.filter(e => e.status === 'ativo');
  const total = employees.length;
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  // Turnover
  const desligMes = terminations.filter(t => t.data_desligamento >= inicioMes).length;
  const admMes = employees.filter(e => e.data_admissao >= inicioMes).length;
  const turnover = total > 0 ? ((admMes + desligMes) / total) * 100 : 0;

  if (desligMes > 0) {
    insights.push({
      icon: <TrendingDown className="w-4 h-4" />,
      message: `Alto índice de turnover detectado. ${desligMes} funcionário(s) saíram da empresa no período analisado.`,
      type: turnover > 10 ? 'danger' : 'warning',
    });
  }

  // Motivo predominante
  if (terminations.length > 0) {
    const motivos: Record<string, number> = {};
    terminations.forEach(t => { motivos[t.motivo] = (motivos[t.motivo] || 0) + 1; });
    const topMotivo = Object.entries(motivos).sort((a, b) => b[1] - a[1])[0];
    if (topMotivo) {
      insights.push({
        icon: <AlertTriangle className="w-4 h-4" />,
        message: `O principal motivo de desligamento foi: ${topMotivo[0]} (${topMotivo[1]} ocorrências).`,
        type: 'warning',
      });
    }

    // Setor crítico
    const setores: Record<string, number> = {};
    terminations.forEach(t => {
      const dept = t.employees?.departamento || 'Sem setor';
      setores[dept] = (setores[dept] || 0) + 1;
    });
    const topSetor = Object.entries(setores).sort((a, b) => b[1] - a[1])[0];
    if (topSetor && topSetor[1] > 1) {
      insights.push({
        icon: <Users className="w-4 h-4" />,
        message: `O setor ${topSetor[0]} apresentou maior índice de desligamentos (${topSetor[1]}).`,
        type: 'danger',
      });
    }

    // Rotatividade inicial (primeiros 6 meses)
    const earlyTerms = terminations.filter(t => {
      const emp = employees.find(e => e.id === t.employee_id);
      if (!emp) return false;
      const adm = new Date(emp.data_admissao);
      const desl = new Date(t.data_desligamento);
      const months = (desl.getFullYear() - adm.getFullYear()) * 12 + (desl.getMonth() - adm.getMonth());
      return months <= 6;
    });
    if (earlyTerms.length > 0 && terminations.length > 0) {
      const pct = Math.round((earlyTerms.length / terminations.length) * 100);
      insights.push({
        icon: <Clock className="w-4 h-4" />,
        message: `${pct}% dos desligamentos ocorreram nos primeiros 6 meses de contratação.`,
        type: pct > 30 ? 'danger' : 'warning',
      });
    }
  }

  // Crescimento da equipe
  const empLastYear = employees.filter(e => {
    const d = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0];
    return e.data_admissao <= d;
  }).length;
  if (empLastYear > 0) {
    const growth = Math.round(((ativos.length - empLastYear) / empLastYear) * 100);
    if (growth > 0) {
      insights.push({
        icon: <TrendingUp className="w-4 h-4" />,
        message: `A empresa cresceu ${growth}% em número de colaboradores no último ano.`,
        type: 'success',
      });
    }
  }

  // Estabilidade
  if (terminations.length === 0) {
    insights.push({
      icon: <TrendingUp className="w-4 h-4" />,
      message: 'Não houve desligamentos registrados. Excelente estabilidade!',
      type: 'success',
    });
  }

  // Absenteísmo
  const diasAtestado = certificates.filter(c => c.data_inicio >= inicioMes).reduce((s: number, c: any) => s + (c.dias || 0), 0);
  const absenteismo = ativos.length > 0 ? (diasAtestado / (ativos.length * 22)) * 100 : 0;
  if (absenteismo > 5) {
    insights.push({
      icon: <AlertTriangle className="w-4 h-4" />,
      message: `Índice de absenteísmo acima da média: ${absenteismo.toFixed(1)}%.`,
      type: 'danger',
    });
  }

  // Treinamentos vencidos
  const hoje = now.toISOString().split('T')[0];
  const trainVencidos = trainings.filter(t => t.data_validade && t.data_validade < hoje).length;
  if (trainVencidos > 0) {
    insights.push({
      icon: <AlertTriangle className="w-4 h-4" />,
      message: `${trainVencidos} colaborador(es) possuem treinamentos vencidos.`,
      type: 'danger',
    });
  }

  // ASO vencido
  const asoVencidos = asos.filter(a => a.data_vencimento && a.data_vencimento < hoje).length;
  if (asoVencidos > 0) {
    insights.push({
      icon: <AlertTriangle className="w-4 h-4" />,
      message: `${asoVencidos} colaborador(es) com exames (ASO) vencidos.`,
      type: 'danger',
    });
  }

  // Férias próximas
  const em30dias = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const feriasProx = vacations.filter(v => v.data_inicio >= hoje && v.data_inicio <= em30dias).length;
  if (feriasProx > 0) {
    insights.push({
      icon: <Users className="w-4 h-4" />,
      message: `${feriasProx} colaborador(es) com férias próximas do vencimento.`,
      type: 'info',
    });
  }

  // Financial insights
  const custoFolha = ativos.reduce((s, e) => s + Number(e.salario || 0), 0);
  const custoMedio = ativos.length > 0 ? custoFolha / ativos.length : 0;

  if (custoMedio > 0) {
    insights.push({
      icon: <DollarSign className="w-4 h-4" />,
      message: `Custo médio mensal por colaborador: ${custoMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
      type: 'info',
    });
  }

  // Setor mais caro
  const custoPorSetor: Record<string, number> = {};
  ativos.forEach(e => {
    const dept = e.departamento || 'Sem setor';
    custoPorSetor[dept] = (custoPorSetor[dept] || 0) + Number(e.salario || 0);
  });
  const topCusto = Object.entries(custoPorSetor).sort((a, b) => b[1] - a[1])[0];
  if (topCusto && custoFolha > 0) {
    const pct = Math.round((topCusto[1] / custoFolha) * 100);
    insights.push({
      icon: <DollarSign className="w-4 h-4" />,
      message: `O setor ${topCusto[0]} representa ${pct}% da folha salarial (${topCusto[1].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).`,
      type: 'info',
    });
  }

  // Turnover cost estimate
  if (terminations.length > 0) {
    const salarioMedio = total > 0 ? employees.reduce((s, e) => s + Number(e.salario || 0), 0) / total : 0;
    const custoTurnover = terminations.length * salarioMedio * 1.5; // estimativa: 1.5x salário
    insights.push({
      icon: <DollarSign className="w-4 h-4" />,
      message: `O turnover no período gerou custo estimado de ${custoTurnover.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
      type: terminations.length > 3 ? 'danger' : 'warning',
    });
  }

  if (insights.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 font-medium mb-3 text-primary">
          <Lightbulb className="w-5 h-5" /> Insights do RH
        </div>
        <div className="grid gap-2">
          {insights.slice(0, 10).map((insight, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${typeBg[insight.type]}`}>
              <div className={`mt-0.5 ${typeColors[insight.type]}`}>{insight.icon}</div>
              <p className="text-sm text-foreground">{insight.message}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
