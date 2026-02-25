import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, AlertTriangle, ShieldCheck, ShieldAlert, XCircle, RefreshCw, Search, DollarSign, CheckCircle, ArrowUpCircle, ArrowDownCircle, ClipboardCheck } from "lucide-react";
import { useInventoryData, InventoryItem } from "@/hooks/useInventoryData";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { data: inventoryData, summary, loading, error, refetch } = useInventoryData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Conciliation summary
  const [concSummary, setConcSummary] = useState({ ok: 0, sobra: 0, falta: 0, semDado: 0, valorDiv: 0 });

  useEffect(() => {
    const fetchConciliation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .not('company_id', 'is', null)
          .limit(1)
          .single();
        if (!roleData?.company_id) return;

        const { data: mats } = await supabase
          .from('materials')
          .select('id, quantidade, preco')
          .eq('company_id', roleData.company_id);

        const { data: saldos } = await supabase
          .from('saldo_sistema_importado')
          .select('material_id, saldo_sistema, created_at')
          .eq('company_id', roleData.company_id)
          .order('created_at', { ascending: false });

        if (!mats) return;

        // Get latest saldo per material
        const latestSaldo = new Map<string, number>();
        (saldos || []).forEach(s => {
          if (!latestSaldo.has(s.material_id)) {
            latestSaldo.set(s.material_id, Number(s.saldo_sistema));
          }
        });

        let ok = 0, sobra = 0, falta = 0, semDado = 0, valorDiv = 0;
        mats.forEach(m => {
          const saldoInvex = Number(m.quantidade);
          if (!latestSaldo.has(m.id)) { semDado++; return; }
          const saldoSis = latestSaldo.get(m.id)!;
          const div = saldoInvex - saldoSis;
          if (div === 0) ok++;
          else if (div > 0) { sobra++; valorDiv += Math.abs(div) * Number(m.preco); }
          else { falta++; valorDiv += Math.abs(div) * Number(m.preco); }
        });
        setConcSummary({ ok, sobra, falta, semDado, valorDiv });
      } catch { /* silent */ }
    };
    fetchConciliation();
  }, [inventoryData]);

  const filteredData = useMemo(() => {
    let filtered = inventoryData;
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.material.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.codigo.toString().includes(searchQuery)
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(item => {
        if (statusFilter === "OK") return item.status.includes("OK");
        if (statusFilter === "Alerta") return item.status.includes("Abaixo");
        if (statusFilter === "Crítico") return item.status.includes("Zerado");
        return true;
      });
    }
    return filtered;
  }, [inventoryData, searchQuery, statusFilter]);

  const alertCount = summary.total_abaixo;
  const criticalCount = summary.total_zerado;
  const isHealthy = alertCount === 0 && criticalCount === 0;

  const handleExportReport = () => {
    try {
      const csvContent = [
        ['Código', 'Material', 'Quantidade', 'Valor Unitário', 'Valor Total', 'Status'],
        ...inventoryData.map(item => [
          item.codigo, item.material, item.quantidade,
          item.preco.toFixed(2), item.valorTotal.toFixed(2), item.status
        ])
      ].map(row => row.join(';')).join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const now = new Date();
      link.setAttribute('href', url);
      link.setAttribute('download', `Relatorio_Invex_${now.toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Relatório exportado com sucesso!" });
    } catch {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
  };

  const getStatusInfo = (item: InventoryItem) => {
    if (item.status.includes("Zerado")) return { label: "Crítico", color: "bg-destructive/15 text-destructive border-destructive/30", dot: "bg-destructive" };
    if (item.status.includes("Abaixo")) return { label: "Alerta", color: "bg-warning/15 text-warning border-warning/30", dot: "bg-warning" };
    return { label: "OK", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", dot: "bg-emerald-500" };
  };

  return (
    <MainLayout onExportReport={handleExportReport} showExport={true} showQRCode={true} showScanQR={true}>
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Erro ao carregar dados: {error}</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" /> Tentar Novamente
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Health Indicator Banner */}
          <Card className={`border-2 ${isHealthy ? 'border-emerald-500/40 bg-emerald-500/5' : criticalCount > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-warning/40 bg-warning/5'}`}>
            <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className={`p-3 rounded-full ${isHealthy ? 'bg-emerald-500/20' : criticalCount > 0 ? 'bg-destructive/20' : 'bg-warning/20'}`}>
                {isHealthy ? <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> :
                  criticalCount > 0 ? <ShieldAlert className="w-6 h-6 text-destructive" /> :
                    <AlertTriangle className="w-6 h-6 text-warning" />}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground">
                  {isHealthy ? '✅ Estoque 100% Saudável' :
                    criticalCount > 0 ? `🔴 ${criticalCount} ${criticalCount === 1 ? 'item crítico' : 'itens críticos'}` :
                      `🟡 ${alertCount} ${alertCount === 1 ? 'item em alerta' : 'itens em alerta'}`}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isHealthy ? 'Todos os itens estão com estoque dentro do esperado.' :
                    `${criticalCount > 0 ? `${criticalCount} zerado(s)` : ''}${criticalCount > 0 && alertCount > 0 ? ' e ' : ''}${alertCount > 0 ? `${alertCount} abaixo do mínimo` : ''} — atenção necessária.`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Conciliation Alerts - clickable */}
          {(concSummary.sobra > 0 || concSummary.falta > 0) && (
            <Card
              className={`border-2 cursor-pointer hover:shadow-md transition-all ${concSummary.falta > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-warning/40 bg-warning/5'}`}
              onClick={() => navigate('/conciliacao?filtro=falta')}
            >
              <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className={`p-3 rounded-full ${concSummary.falta > 0 ? 'bg-destructive/20' : 'bg-warning/20'}`}>
                  <ClipboardCheck className={`w-6 h-6 ${concSummary.falta > 0 ? 'text-destructive' : 'text-warning'}`} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-foreground">
                    Conciliação: {concSummary.falta > 0 ? `🔴 ${concSummary.falta} com falta` : ''}{concSummary.falta > 0 && concSummary.sobra > 0 ? ' e ' : ''}{concSummary.sobra > 0 ? `🟡 ${concSummary.sobra} com sobra` : ''}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Valor total das divergências: R$ {concSummary.valorDiv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(statusFilter === "OK" ? null : "OK")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">OK</span>
                  <div className="p-2 rounded-lg bg-emerald-500/10"><Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{summary.total_ok}</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(statusFilter === "Alerta" ? null : "Alerta")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alerta</span>
                  <div className="p-2 rounded-lg bg-warning/10"><AlertTriangle className="w-4 h-4 text-warning" /></div>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{summary.total_abaixo}</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(statusFilter === "Crítico" ? null : "Crítico")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Críticos</span>
                  <div className="p-2 rounded-lg bg-destructive/10"><XCircle className="w-4 h-4 text-destructive" /></div>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{summary.total_zerado}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor Total</span>
                  <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="w-4 h-4 text-primary" /></div>
                </div>
                <p className="text-xl md:text-2xl font-bold text-foreground">
                  R$ {summary.total_estoque_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/conciliacao?filtro=ok')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conc. OK</span>
                  <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{concSummary.ok}</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/conciliacao?filtro=sobra')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sobra</span>
                  <div className="p-2 rounded-lg bg-warning/10"><ArrowUpCircle className="w-4 h-4 text-warning" /></div>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{concSummary.sobra}</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/conciliacao?filtro=falta')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Falta</span>
                  <div className="p-2 rounded-lg bg-destructive/10"><ArrowDownCircle className="w-4 h-4 text-destructive" /></div>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{concSummary.falta}</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/conciliacao')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor Diverg.</span>
                  <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="w-4 h-4 text-primary" /></div>
                </div>
                <p className="text-xl md:text-2xl font-bold text-foreground">
                  R$ {concSummary.valorDiv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Active Filters */}
          {statusFilter && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Filtro:</span>
              <Badge variant="secondary" className="cursor-pointer" onClick={() => setStatusFilter(null)}>
                {statusFilter} ✕
              </Badge>
            </div>
          )}

          {/* Search + Refresh */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-lg md:text-xl font-bold text-foreground">
              Materiais ({filteredData.length})
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar material..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Button onClick={refetch} variant="outline" size="icon" className="shrink-0">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Material Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {filteredData.map((item) => {
              const status = getStatusInfo(item);
              return (
                <Card key={item.codigo} className={`border ${status.color} transition-all hover:shadow-md`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-muted-foreground">{item.codigo}</p>
                        <p className="font-semibold text-sm text-foreground truncate" title={item.material}>
                          {item.material}
                        </p>
                      </div>
                      <Badge variant="outline" className={`shrink-0 text-xs ${status.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status.dot}`} />
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold text-foreground">{item.quantidade}</p>
                        <p className="text-xs text-muted-foreground">{item.unidade}</p>
                      </div>
                      <p className="text-xs text-muted-foreground text-right">
                        R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredData.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum material encontrado.
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
};

export default Index;
