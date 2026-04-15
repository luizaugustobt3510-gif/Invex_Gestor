import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench, AlertTriangle, CheckCircle, Clock, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const DashboardManutencao = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, emDia: 0, vencidos: 0, osPendentes: 0 });
  const [recentRecords, setRecentRecords] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.companyId) return;
    const load = async () => {
      const [recRes, osRes] = await Promise.all([
        supabase.from('maintenance_records').select('*').eq('company_id', user.companyId!),
        supabase.from('maintenance_service_orders').select('*').eq('company_id', user.companyId!).eq('status', 'pendente'),
      ]);
      const records = recRes.data || [];
      const today = new Date().toISOString().split('T')[0];
      const emDia = records.filter(r => r.data_validade >= today).length;
      const vencidos = records.filter(r => r.data_validade < today).length;
      setStats({ total: records.length, emDia, vencidos, osPendentes: (osRes.data || []).length });
      
      // Sort by urgency: vencidos first, then by dias_para_vencer
      const sorted = [...records].sort((a, b) => {
        const dA = Math.ceil((new Date(a.data_validade).getTime() - Date.now()) / 86400000);
        const dB = Math.ceil((new Date(b.data_validade).getTime() - Date.now()) / 86400000);
        return dA - dB;
      });
      setRecentRecords(sorted.slice(0, 8));
    };
    load();
  }, [user?.companyId]);

  const calcDias = (dataValidade: string) => Math.ceil((new Date(dataValidade).getTime() - Date.now()) / 86400000);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="w-6 h-6" /> Manutenção
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/manutencao/listagem')}>
            <CardContent className="p-4 text-center">
              <Wrench className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Equipamentos</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/manutencao/listagem?status=em_dia')}>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-green-600">{stats.emDia}</p>
              <p className="text-sm text-muted-foreground">Em Dia</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/manutencao/listagem?status=vencido')}>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold text-red-600">{stats.vencidos}</p>
              <p className="text-sm text-muted-foreground">Vencidos</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/manutencao/solicitacao-os')}>
            <CardContent className="p-4 text-center">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold text-orange-600">{stats.osPendentes}</p>
              <p className="text-sm text-muted-foreground">OS Pendentes</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" /> Equipamentos com Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRecords.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum equipamento cadastrado ainda.</p>
            ) : (
              <div className="space-y-2">
                {recentRecords.map(r => {
                  const dias = calcDias(r.data_validade);
                  const vencido = dias <= 0;
                  return (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{r.equipamento}</p>
                        <p className="text-sm text-muted-foreground">{r.controle} • {r.frequencia}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={vencido ? 'destructive' : 'default'} className={!vencido ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                          {vencido ? 'VENCIDO' : 'EM DIA'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{dias} dias</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DashboardManutencao;
