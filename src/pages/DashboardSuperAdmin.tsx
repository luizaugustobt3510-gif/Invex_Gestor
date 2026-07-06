import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Building, Users, CreditCard, Puzzle, Settings, ScrollText, Shield, RefreshCw, AlertTriangle, Ban, CalendarClock, TrendingUp, TrendingDown } from 'lucide-react';

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const daysUntil = (iso: string) => {
  const d = new Date(iso + 'T00:00:00'); const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
};

const DashboardSuperAdmin = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    companies: 0, activeCompanies: 0, users: 0, plans: 0,
    subActive: 0, subOverdue: 0, subBlocked: 0, dueSoon: 0,
    revenueForecast: 0, revenueOverdue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [companiesRes, rolesRes, plansRes] = await Promise.all([
          supabase.from('companies').select('id, status, subscription_status, monthly_fee, next_due_date'),
          supabase.from('user_roles').select('id'),
          supabase.from('company_plans').select('id, is_active'),
        ]);

        const companies = (companiesRes.data || []) as any[];
        // Re-evaluate statuses to keep dashboard accurate
        await Promise.all(companies.map(c =>
          supabase.rpc('evaluate_subscription_status', { _company_id: c.id })
        ));
        const { data: refreshed } = await supabase
          .from('companies')
          .select('id, status, subscription_status, monthly_fee, next_due_date');
        const list = (refreshed || companies) as any[];

        let subActive = 0, subOverdue = 0, subBlocked = 0, dueSoon = 0;
        let revenueForecast = 0, revenueOverdue = 0;
        list.forEach(c => {
          const fee = Number(c.monthly_fee) || 0;
          revenueForecast += fee;
          if (c.subscription_status === 'ativa') subActive++;
          if (c.subscription_status === 'em_atraso') { subOverdue++; revenueOverdue += fee; }
          if (c.subscription_status === 'bloqueada') { subBlocked++; revenueOverdue += fee; }
          if (c.next_due_date) {
            const d = daysUntil(c.next_due_date);
            if (d >= 0 && d <= 7) dueSoon++;
          }
        });

        setStats({
          companies: list.length,
          activeCompanies: list.filter(c => c.status === 'ativa').length,
          users: (rolesRes.data || []).length,
          plans: (plansRes.data || []).filter(p => p.is_active).length,
          subActive, subOverdue, subBlocked, dueSoon, revenueForecast, revenueOverdue,
        });
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchStats();
  }, []);


  const sections = [
    {
      title: 'Gestão de Empresas',
      description: 'Criar, editar, ativar/desativar empresas cadastradas',
      icon: Building,
      path: '/gestao-empresas',
      stat: `${stats.activeCompanies}/${stats.companies} ativas`,
      actions: ['Criar empresa', 'Editar empresa', 'Ativar/Desativar'],
    },
    {
      title: 'Gestão de Usuários',
      description: 'Criar usuários, vincular a empresas, definir permissões e módulos',
      icon: Users,
      path: '/gestao-usuarios',
      stat: `${stats.users} usuários`,
      actions: ['Criar usuário', 'Editar perfil', 'Vincular empresa', 'Definir módulos'],
    },
    {
      title: 'Gestão de Contas',
      description: 'Planos, limites de acesso e status das contas',
      icon: CreditCard,
      path: '/gestao-planos',
      stat: `${stats.plans} planos ativos`,
      actions: ['Listar contas', 'Status da conta', 'Nível de acesso'],
    },
    {
      title: 'Controle de Módulos',
      description: 'Ativar/desativar módulos por empresa',
      icon: Puzzle,
      path: '/gestao-modulos',
      stat: 'Por empresa',
      actions: ['Estoque', 'RH', 'Financeiro', 'Relatórios'],
    },
    {
      title: 'Configurações',
      description: 'Configurações gerais do sistema',
      icon: Settings,
      path: '/config-sistema',
      stat: '',
      actions: ['Parâmetros do sistema'],
    },
    {
      title: 'Logs / Auditoria',
      description: 'Histórico de ações e alterações no sistema',
      icon: ScrollText,
      path: '/logs-auditoria',
      stat: '',
      actions: ['Visualizar logs', 'Filtrar por ação'],
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Painel do Super Administrador</h1>
              <p className="text-sm text-muted-foreground">Gestão estrutural da plataforma Invex</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Empresas</span>
                <div className="p-2 rounded-lg bg-primary/10"><Building className="w-4 h-4 text-primary" /></div>
              </div>
              <p className="text-2xl font-bold text-foreground">{loading ? '...' : stats.companies}</p>
              <p className="text-xs text-muted-foreground">{stats.activeCompanies} ativas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Usuários</span>
                <div className="p-2 rounded-lg bg-primary/10"><Users className="w-4 h-4 text-primary" /></div>
              </div>
              <p className="text-2xl font-bold text-foreground">{loading ? '...' : stats.users}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Planos Ativos</span>
                <div className="p-2 rounded-lg bg-primary/10"><CreditCard className="w-4 h-4 text-primary" /></div>
              </div>
              <p className="text-2xl font-bold text-foreground">{loading ? '...' : stats.plans}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Módulos</span>
                <div className="p-2 rounded-lg bg-primary/10"><Puzzle className="w-4 h-4 text-primary" /></div>
              </div>
              <p className="text-2xl font-bold text-foreground">4</p>
              <p className="text-xs text-muted-foreground">disponíveis</p>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Indicators */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Controle de Assinaturas</h2>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ativas</span>
                  <div className="p-2 rounded-lg bg-success/10"><Shield className="w-4 h-4 text-success" /></div>
                </div>
                <p className="text-2xl font-bold text-foreground">{loading ? '...' : stats.subActive}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Em atraso</span>
                  <div className="p-2 rounded-lg bg-warning/10"><AlertTriangle className="w-4 h-4 text-warning" /></div>
                </div>
                <p className="text-2xl font-bold text-warning">{loading ? '...' : stats.subOverdue}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bloqueadas</span>
                  <div className="p-2 rounded-lg bg-destructive/10"><Ban className="w-4 h-4 text-destructive" /></div>
                </div>
                <p className="text-2xl font-bold text-destructive">{loading ? '...' : stats.subBlocked}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vencem em 7d</span>
                  <div className="p-2 rounded-lg bg-primary/10"><CalendarClock className="w-4 h-4 text-primary" /></div>
                </div>
                <p className="text-2xl font-bold text-foreground">{loading ? '...' : stats.dueSoon}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Receita prevista</span>
                  <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="w-4 h-4 text-success" /></div>
                </div>
                <p className="text-lg font-bold text-foreground">{loading ? '...' : currency(stats.revenueForecast)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Em atraso (R$)</span>
                  <div className="p-2 rounded-lg bg-destructive/10"><TrendingDown className="w-4 h-4 text-destructive" /></div>
                </div>
                <p className="text-lg font-bold text-destructive">{loading ? '...' : currency(stats.revenueOverdue)}</p>
              </CardContent>
            </Card>
          </div>
        </div>


        {/* Section Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map(section => (
            <Card
              key={section.path}
              className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
              onClick={() => navigate(section.path)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <section.icon className="w-5 h-5 text-primary" />
                  </div>
                  {section.stat && (
                    <Badge variant="secondary" className="text-xs">{section.stat}</Badge>
                  )}
                </div>
                <CardTitle className="text-lg mt-2">{section.title}</CardTitle>
                <CardDescription className="text-sm">{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {section.actions.map(action => (
                    <Badge key={action} variant="outline" className="text-xs font-normal">
                      {action}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardSuperAdmin;
