import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, DollarSign, ShoppingCart, Users, Dumbbell, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { financeiroService } from "@/services/financeiroService";
import { vendasService } from "@/services/vendasService";
import { logisticaService } from "@/services/logisticaService";
import { supabase } from "@/integrations/supabase/client";
import { InsightsPanel } from "@/components/insights/InsightsPanel";
import { generateLogisticaInsights } from "@/components/insights/generateLogisticaInsights";
import { generateFinanceiroInsights } from "@/components/insights/generateFinanceiroInsights";
import { generateVendasInsights } from "@/components/insights/generateVendasInsights";
import { generateRHInsights } from "@/components/insights/generateRHInsights";
import type { Insight } from "@/components/insights/types";

interface ModuleStats {
  logistica?: { totalItens: number; valorEstoque: number; criticos: number };
  financeiro?: { receitas: number; despesas: number; lucro: number };
  vendas?: { totalVendas: number; faturamento: number };
  rh?: { totalColaboradores: number; ativos: number };
  academia?: { totalAlunos: number; ativos: number };
}

const DashboardEmpresa = () => {
  const { user } = useAuth();
  const { canAccessModule } = useModuleAccess();
  const [stats, setStats] = useState<ModuleStats>({});
  const [allInsights, setAllInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  const canSeeDashboardModule = useCallback((moduleKey: 'logistica' | 'financeiro' | 'vendas' | 'rh' | 'academia') => {
    if (!user) return false;

    if (user.role === 'superadm' || user.role === 'admin') {
      return canAccessModule(moduleKey);
    }

    switch (user.role) {
      case 'rh':
      case 'visualizador':
        return moduleKey === 'rh' && canAccessModule(moduleKey);
      case 'financeiro':
        return moduleKey === 'financeiro' && canAccessModule(moduleKey);
      case 'logistica':
      case 'usuario almox':
        return moduleKey === 'logistica' && canAccessModule(moduleKey);
      default:
        return false;
    }
  }, [user, canAccessModule]);

  useEffect(() => {
    if (!user?.companyId) return;
    const companyId = user.companyId;

    const fetchAll = async () => {
      setLoading(true);
      const result: ModuleStats = {};
      const insights: Insight[] = [];
      const promises: Promise<void>[] = [];

      if (canSeeDashboardModule('logistica')) {
        promises.push(
          (async () => {
            const { data } = await logisticaService.getMaterials(companyId);
            const mats = data || [];
            const valorEstoque = mats.reduce((s, m) => s + Number(m.quantidade) * Number(m.preco), 0);
            const criticos = mats.filter(m => Number(m.quantidade) <= 0).length;
            result.logistica = { totalItens: mats.length, valorEstoque, criticos };

            // Conciliation data
            const { data: saldos } = await logisticaService.getSaldoSistema(companyId);
            const latestSaldo = new Map<string, number>();
            (saldos || []).forEach(s => {
              if (!latestSaldo.has(s.material_id)) latestSaldo.set(s.material_id, Number(s.saldo_sistema));
            });
            let ok = 0, sobra = 0, falta = 0, valorDiv = 0;
            mats.forEach(m => {
              const qi = Number(m.quantidade);
              if (!latestSaldo.has(m.id)) return;
              const qs = latestSaldo.get(m.id)!;
              const d = qi - qs;
              if (d === 0) ok++;
              else if (d > 0) { sobra++; valorDiv += Math.abs(d) * Number(m.preco); }
              else { falta++; valorDiv += Math.abs(d) * Number(m.preco); }
            });

            insights.push(...generateLogisticaInsights(
              mats.map(m => ({ quantidade: Number(m.quantidade), minimo: Number(m.minimo), maximo: Number(m.maximo), preco: Number(m.preco), material: m.material })),
              { ok, sobra, falta, valorDiv }
            ));
          })()
        );
      }

      if (canSeeDashboardModule('financeiro')) {
        promises.push(
          (async () => {
            const { data } = await financeiroService.getEntries(companyId);
            const entries = data || [];
            const s = financeiroService.computeStats(entries as any);
            result.financeiro = { receitas: s.receitas, despesas: s.despesas, lucro: s.lucro };
            insights.push(...generateFinanceiroInsights(s, entries));
          })()
        );
      }

      if (canSeeDashboardModule('vendas')) {
        promises.push(
          (async () => {
            const { data } = await vendasService.getSales(companyId);
            const sales = data || [];
            const faturamento = sales.reduce((s, v) => s + Number(v.valor_total), 0);
            result.vendas = { totalVendas: sales.length, faturamento };
            const s = vendasService.computeStats(sales as any);
            insights.push(...generateVendasInsights(s, sales));
          })()
        );
      }

      if (canSeeDashboardModule('rh')) {
        promises.push(
          (async () => {
            const { data: emps } = await supabase.from('employees').select('*').eq('company_id', companyId);
            const employees = emps || [];
            result.rh = { totalColaboradores: employees.length, ativos: employees.filter(e => e.status === 'ativo').length };

            const [{ data: terms }, { data: certs }, { data: trains }, { data: asoData }, { data: vacs }] = await Promise.all([
              supabase.from('employee_terminations').select('*').eq('company_id', companyId),
              supabase.from('employee_certificates').select('*').eq('company_id', companyId),
              supabase.from('employee_trainings').select('*').eq('company_id', companyId),
              supabase.from('employee_asos').select('*').eq('company_id', companyId),
              supabase.from('employee_vacations').select('*').eq('company_id', companyId),
            ]);

            insights.push(...generateRHInsights({
              employees,
              terminations: terms || [],
              certificates: certs || [],
              trainings: trains || [],
              asos: asoData || [],
              vacations: vacs || [],
            }));
          })()
        );
      }

      if (canSeeDashboardModule('academia')) {
        promises.push(
          supabase.from('academy_students').select('id, status').eq('company_id', companyId).then(({ data }) => {
            const students = data || [];
            result.academia = { totalAlunos: students.length, ativos: students.filter(s => s.status === 'ativo').length };
          }) as Promise<void>
        );
      }

      await Promise.all(promises);
      setStats(result);
      setAllInsights(insights);
      setLoading(false);
    };

    fetchAll();
  }, [user?.companyId, canSeeDashboardModule]);

  const hasAnyModule = Object.keys(stats).length > 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard da Empresa</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada dos módulos ativos</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : !hasAnyModule ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground mb-2">Nenhum módulo ativo</h2>
              <p className="text-sm text-muted-foreground">
                Nenhum módulo está habilitado para sua empresa ou seu perfil. Contate o administrador.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Insights consolidados */}
            <InsightsPanel
              insights={allInsights}
              title="Insights da Empresa"
              groupByModule={true}
              maxItems={16}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.logistica && (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Package className="w-4 h-4" /> Itens em Estoque
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-foreground">{stats.logistica.totalItens}</p>
                      {stats.logistica.criticos > 0 && (
                        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3" /> {stats.logistica.criticos} crítico(s)
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> Valor do Estoque
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-foreground">
                        R$ {stats.logistica.valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}

              {stats.financeiro && (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Receitas (Pagas)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        R$ {stats.financeiro.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> Lucro
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-2xl font-bold ${stats.financeiro.lucro >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                        R$ {stats.financeiro.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}

              {stats.vendas && (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" /> Total de Vendas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-foreground">{stats.vendas.totalVendas}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> Faturamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-foreground">
                        R$ {stats.vendas.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}

              {stats.rh && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" /> Colaboradores
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{stats.rh.ativos}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stats.rh.totalColaboradores} total</p>
                  </CardContent>
                </Card>
              )}

              {stats.academia && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Dumbbell className="w-4 h-4" /> Alunos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{stats.academia.ativos}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stats.academia.totalAlunos} total</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default DashboardEmpresa;
