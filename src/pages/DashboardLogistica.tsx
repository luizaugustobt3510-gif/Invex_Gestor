import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, AlertTriangle, ShieldCheck, ShieldAlert, XCircle, RefreshCw, Search, DollarSign, CheckCircle, ArrowUpCircle, ArrowDownCircle, ClipboardCheck, Edit, Thermometer, TrendingUp, Trash2, Printer, Layers } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { printList } from "@/lib/printUtils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCurvaABCData, ABCResult } from "@/hooks/useCurvaABCData";
import { useInventoryData, InventoryItem } from "@/hooks/useInventoryData";
import { getValidadeInfo } from "@/lib/validade";
import { CalendarClock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EditMaterialDialog } from "@/components/EditMaterialDialog";


const DashboardLogistica = () => {
  const navigate = useNavigate();
  const { data: inventoryData, summary, loading, error, refetch } = useInventoryData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission(['superadm', 'admin', 'logistica', 'usuario almox']);

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('materials').delete().eq('id', deleteItem.id);
      if (error) throw error;
      toast({ title: 'Material excluído', description: deleteItem.material });
      setDeleteItem(null);
      refetch();
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e?.message || 'Tente novamente', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  // Conciliation summary
  const [concSummary, setConcSummary] = useState({ ok: 0, sobra: 0, falta: 0, semDado: 0, valorDiv: 0 });
  const [tempStatus, setTempStatus] = useState<Record<string, boolean>>({});
  
  // Curva ABC from database
  const { results: abcResults } = useCurvaABCData();
  
  const abcMap = useMemo(() => {
    const map = new Map<string, ABCResult>();
    abcResults.forEach(r => map.set(r.material.toUpperCase().trim(), r));
    return map;
  }, [abcResults]);
  
  const abcSummary = useMemo(() => ({
    qtdA: abcResults.filter(r => r.classe === 'A').length,
    qtdB: abcResults.filter(r => r.classe === 'B').length,
    qtdC: abcResults.filter(r => r.classe === 'C').length,
    totalCompra: abcResults.reduce((s, r) => s + r.compraSugerida, 0),
  }), [abcResults]);

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

        // Fetch today's temperature records
        const hoje = new Date().toISOString().split('T')[0];
        const { data: tempRecs } = await supabase
          .from('temperature_records')
          .select('local')
          .eq('data', hoje);
        const ts: Record<string, boolean> = {};
        ['almoxarifado', 'armario_medicamentos'].forEach(l => {
          ts[l] = (tempRecs || []).some((r: any) => r.local === l);
        });
        setTempStatus(ts);
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
    if (groupFilter) {
      filtered = filtered.filter(item => (item.groupName || 'Sem grupo') === groupFilter);
    }
    return filtered;
  }, [inventoryData, searchQuery, statusFilter, groupFilter]);

  // Lista de grupos disponíveis (para o filtro)
  const groupList = useMemo(() => {
    const map = new Map<string, number>();
    inventoryData.forEach(i => {
      const nome = i.groupName || 'Sem grupo';
      map.set(nome, (map.get(nome) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [inventoryData]);

  // Gráfico: valor total em estoque por grupo (respeita busca/status)
  const groupValueChart = useMemo(() => {
    const map = new Map<string, { nome: string; itens: number; valor: number }>();
    filteredData.forEach(i => {
      const nome = i.groupName || 'Sem grupo';
      const g = map.get(nome) || { nome, itens: 0, valor: 0 };
      g.itens++;
      g.valor += i.valorTotal;
      map.set(nome, g);
    });
    return [...map.values()].sort((a, b) => b.valor - a.valor).slice(0, 8);
  }, [filteredData]);

  // Gráfico: vencimentos (quantidade e valor por status de validade)
  const validadeChart = useMemo(() => {
    const base = [
      { status: 'vencido', label: 'Vencidos', cor: 'hsl(0 84% 60%)', itens: 0, valor: 0 },
      { status: 'critico', label: 'Vencem em 30d', cor: 'hsl(25 95% 53%)', itens: 0, valor: 0 },
      { status: 'atencao', label: 'Vencem em 90d', cor: 'hsl(45 93% 47%)', itens: 0, valor: 0 },
      { status: 'ok', label: 'OK (>90d)', cor: 'hsl(142 76% 36%)', itens: 0, valor: 0 },
      { status: 'sem_validade', label: 'Sem validade', cor: 'hsl(220 9% 46%)', itens: 0, valor: 0 },
    ];
    filteredData.forEach(i => {
      const st = getValidadeInfo(i.validade).status;
      const bucket = base.find(b => b.status === st)!;
      bucket.itens++;
      bucket.valor += i.valorTotal;
    });
    return base;
  }, [filteredData]);

  const validadeStats = (() => {
    let vencido = 0, critico = 0, atencao = 0;
    inventoryData.forEach(i => {
      const st = getValidadeInfo(i.validade).status;
      if (st === 'vencido') vencido++;
      else if (st === 'critico') critico++;
      else if (st === 'atencao') atencao++;
    });
    return { vencido, critico, atencao };
  })();

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
          {/* Curva ABC Summary */}
          {abcResults.length > 0 && (
            <Card className="border-2 border-primary/30 bg-primary/5 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/curva-abc')}>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-full bg-primary/20">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Curva ABC Inteligente</h2>
                    <p className="text-sm text-muted-foreground">{abcResults.length} materiais classificados</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Classe A</p>
                    <p className="text-lg font-bold text-destructive">{abcSummary.qtdA}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Classe B</p>
                    <p className="text-lg font-bold text-warning">{abcSummary.qtdB}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Classe C</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{abcSummary.qtdC}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Compras Sugeridas</p>
                    <p className="text-lg font-bold text-primary">{abcSummary.totalCompra}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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

          {/* Conciliation Alerts */}
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

          {(validadeStats.vencido > 0 || validadeStats.critico > 0 || validadeStats.atencao > 0) && (
            <Card
              className={`border-2 cursor-pointer hover:shadow-md transition-all ${validadeStats.vencido > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-warning/40 bg-warning/5'}`}
              onClick={() => navigate('/controle-validades')}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-full bg-warning/10">
                  <CalendarClock className="w-6 h-6 text-warning" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-foreground mb-1">Alertas de validade</h2>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="text-destructive">{validadeStats.vencido} vencido(s)</span>
                    <span className="text-destructive">{validadeStats.critico} vence(m) em 30 dias</span>
                    <span className="text-warning">{validadeStats.atencao} vence(m) em 90 dias</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Temperature Check Status */}
          <Card className="border-2 border-border cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/conferencia-temperatura')}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Thermometer className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-foreground mb-1">Conferências do dia</h2>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className={tempStatus['almoxarifado'] ? 'text-emerald-600' : 'text-destructive'}>
                    {tempStatus['almoxarifado'] ? '✔' : '❌'} Almoxarifado
                  </span>
                  <span className={tempStatus['armario_medicamentos'] ? 'text-emerald-600' : 'text-destructive'}>
                    {tempStatus['armario_medicamentos'] ? '✔' : '❌'} Armário Medicamentos
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

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

          {/* Filtro por grupo de materiais */}
          {groupList.length > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Filtrar por grupo</h2>
                  {groupFilter && (
                    <Button size="sm" variant="ghost" className="h-6 text-xs ml-auto" onClick={() => setGroupFilter(null)}>
                      Limpar ✕
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {groupList.map(([nome, qtd]) => (
                    <Badge
                      key={nome}
                      variant={groupFilter === nome ? 'default' : 'outline'}
                      className="cursor-pointer select-none"
                      onClick={() => setGroupFilter(groupFilter === nome ? null : nome)}
                    >
                      {nome} ({qtd})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gráficos: Valor por grupo + Vencimentos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-bold text-foreground mb-1">Valor em estoque por grupo</h2>
                <p className="text-xs text-muted-foreground mb-3">Soma do valor total dos itens de cada grupo</p>
                {groupValueChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Sem dados para exibir.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={groupValueChart} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number, name: string) =>
                          name === 'valor'
                            ? [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor total']
                            : [value, name]
                        }
                        labelFormatter={(label: string) => `Grupo: ${label}`}
                      />
                      <Bar dataKey="valor" fill="hsl(142 76% 36%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <div className="mt-3 space-y-1">
                  {groupValueChart.map(g => (
                    <div key={g.nome} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate">{g.nome} · {g.itens} item(ns)</span>
                      <span className="font-medium text-foreground">R$ {g.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-bold text-foreground mb-1">Vencimentos</h2>
                <p className="text-xs text-muted-foreground mb-3">Itens e valores por situação de validade</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={validadeChart} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number, name: string, props: any) =>
                        name === 'itens'
                          ? [`${value} item(ns) · R$ ${Number(props?.payload?.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Itens / Valor']
                          : [value, name]
                      }
                    />
                    <Bar dataKey="itens" radius={[4, 4, 0, 0]}>
                      {validadeChart.map(v => (
                        <Cell key={v.status} fill={v.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-2 gap-1">
                  {validadeChart.map(v => (
                    <div key={v.status} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: v.cor }} />
                        {v.label}
                      </span>
                      <span className="font-medium text-foreground">
                        {v.itens} · R$ {v.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Filters */}
          {(statusFilter || groupFilter) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Filtro:</span>
              {statusFilter && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setStatusFilter(null)}>
                  {statusFilter} ✕
                </Badge>
              )}
              {groupFilter && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setGroupFilter(null)}>
                  Grupo: {groupFilter} ✕
                </Badge>
              )}
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
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1"
                disabled={filteredData.length === 0}
                onClick={() => {
                  const filtros: string[] = [];
                  if (searchQuery) filtros.push(`Busca: "${searchQuery}"`);
                  if (statusFilter) filtros.push(`Status: ${statusFilter}`);
                  if (groupFilter) filtros.push(`Grupo: ${groupFilter}`);
                  printList<InventoryItem>({
                    title: 'Materiais — Logística',
                    subtitle: filtros.join(' · '),
                    rows: filteredData,
                    columns: [
                      { header: 'Código', accessor: i => i.codigo },
                      { header: 'Material', accessor: i => i.material },
                      { header: 'Qtd', accessor: i => i.quantidade, align: 'right' },
                      { header: 'Unidade', accessor: i => i.unidade },
                      { header: 'Valor Unit.', accessor: i => `R$ ${i.preco.toFixed(2)}`, align: 'right' },
                      { header: 'Valor Total', accessor: i => `R$ ${i.valorTotal.toFixed(2)}`, align: 'right' },
                      { header: 'Status', accessor: i => i.status },
                    ],
                  });
                }}
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Imprimir</span>
              </Button>
              <Button onClick={refetch} variant="outline" size="icon" className="shrink-0">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Material Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-4">
            {filteredData.map((item) => {
              const status = getStatusInfo(item);
              const abc = abcMap.get(item.material.toUpperCase().trim());
              return (
                <Card key={item.codigo} className={`border ${status.color} transition-all hover:shadow-md`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-muted-foreground">{item.codigo}</p>
                        <p className="font-semibold text-sm text-foreground leading-snug break-words line-clamp-2" title={item.material}>
                          {item.material}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {abc && (
                          <Badge variant="outline" className={`text-xs ${abc.classe === 'A' ? 'bg-destructive/10 text-destructive border-destructive/30' : abc.classe === 'B' ? 'bg-warning/10 text-warning border-warning/30' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'}`}>
                            {abc.classe}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-xs ${status.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status.dot}`} />
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold text-foreground">{item.quantidade}</p>
                        <p className="text-xs text-muted-foreground">{item.unidade}</p>
                      </div>
                      <div className="flex items-end gap-2">
                        {isAdmin && (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditItem(item); setEditOpen(true); }}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteItem(item)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        <p className="text-xs text-muted-foreground text-right">
                          R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    {abc && abc.compraSugerida > 0 && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                        <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                        <p className="text-xs text-primary font-medium">
                          Compra sugerida: <span className="font-bold">{abc.compraSugerida}</span> un
                        </p>
                      </div>
                    )}
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

      <EditMaterialDialog
        item={editItem}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={refetch}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir material?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteItem?.material}</strong> (cód. {deleteItem?.codigo})? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default DashboardLogistica;
