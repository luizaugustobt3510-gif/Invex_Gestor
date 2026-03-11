import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Puzzle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COMPANY_MODULES = [
  { key: 'logistica', label: 'Logística', description: 'Estoque, conferência, ordens de compra, importações' },
  { key: 'rh_module', label: 'RH', description: 'Gestão de pessoas, férias, ASO, treinamentos' },
  { key: 'financeiro_module', label: 'Financeiro', description: 'Controle financeiro e orçamentário' },
  { key: 'compras', label: 'Compras', description: 'Ordens de compra e solicitações' },
  { key: 'relatorios', label: 'Relatórios', description: 'Relatórios gerenciais e exportações' },
];

interface Company {
  id: string;
  name: string;
}

interface ModuleState {
  [key: string]: boolean;
}

const GestaoModulos = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [modules, setModules] = useState<ModuleState>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      setCompanies(data || []);
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    const fetchModules = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('company_modules')
        .select('module_key, is_active')
        .eq('company_id', selectedCompany);

      const state: ModuleState = {};
      COMPANY_MODULES.forEach(m => { state[m.key] = true; }); // default all active
      (data || []).forEach(d => { state[d.module_key] = d.is_active; });
      setModules(state);
      setLoading(false);
    };
    fetchModules();
  }, [selectedCompany]);

  const toggleModule = async (moduleKey: string, active: boolean) => {
    setModules(prev => ({ ...prev, [moduleKey]: active }));
    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_modules')
        .upsert(
          { company_id: selectedCompany, module_key: moduleKey, is_active: active },
          { onConflict: 'company_id,module_key' }
        );
      if (error) throw error;
      toast({ title: active ? 'Módulo ativado' : 'Módulo desativado' });
    } catch {
      setModules(prev => ({ ...prev, [moduleKey]: !active }));
      toast({ title: 'Erro', description: 'Erro ao atualizar módulo.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Puzzle className="w-5 h-5" />
              Gestão de Módulos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Selecione a Empresa</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger><SelectValue placeholder="Escolha uma empresa" /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCompany && !loading && (
              <div className="space-y-3">
                {ALL_MODULES.map(mod => (
                  <div key={mod.key} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm font-medium">{mod.label}</span>
                    <Switch
                      checked={modules[mod.key] ?? true}
                      onCheckedChange={(checked) => toggleModule(mod.key, checked)}
                      disabled={saving}
                    />
                  </div>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Carregando...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default GestaoModulos;
