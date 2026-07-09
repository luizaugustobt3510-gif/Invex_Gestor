import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Puzzle, RefreshCw, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MODULES_CATALOG } from '@/config/modules';

// Módulos opt-in (iniciam desativados por padrão)
const OPT_IN_MODULES = new Set(['anamnese']);

const MODULE_STRUCTURE = MODULES_CATALOG.map((m) => ({
  key: m.key,
  label: m.label,
  description: m.description,
  submodules: m.submodules,
}));

interface Company {
  id: string;
  name: string;
  company_type?: string | null;
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

  // SuperAdmin vê todos os módulos — sem filtro por tipo de empresa.
  const visibleModules = MODULE_STRUCTURE;


  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabase.from('companies').select('id, name, company_type').order('name');
      setCompanies((data || []) as any);
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
      // Default all modules and submodules to active — except opt-in modules like 'anamnese'
      MODULE_STRUCTURE.forEach(m => {
        state[m.key] = m.key === 'anamnese' ? false : true;
        m.submodules.forEach(s => { state[s.key] = true; });
      });
      // Override with DB values
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
      toast({ title: active ? 'Ativado' : 'Desativado' });
    } catch {
      setModules(prev => ({ ...prev, [moduleKey]: !active }));
      toast({ title: 'Erro', description: 'Erro ao atualizar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Puzzle className="w-5 h-5" />
              Gestão de Módulos e Submódulos
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
              <div className="space-y-4">
                {visibleModules.map(mod => {
                  const isParentActive = modules[mod.key] ?? true;
                  return (
                    <Collapsible key={mod.key} defaultOpen={false} className="group/mod">
                      <div className="rounded-lg border">
                        {/* Parent module toggle */}
                        <div className="flex items-center justify-between p-4">
                          <CollapsibleTrigger asChild>
                            <button className="flex items-center gap-2 text-left flex-1">
                              {mod.submodules.length > 0 && (
                                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]/mod:rotate-180" />
                              )}
                              <div>
                                <span className="text-sm font-medium">{mod.label}</span>
                                <p className="text-xs text-muted-foreground">{mod.description}</p>
                              </div>
                            </button>
                          </CollapsibleTrigger>
                          <Switch
                            checked={isParentActive}
                            onCheckedChange={(checked) => toggleModule(mod.key, checked)}
                            disabled={saving}
                          />
                        </div>

                        {/* Submodules */}
                        {mod.submodules.length > 0 && (
                          <CollapsibleContent>
                            <div className="border-t px-4 py-2 space-y-2 bg-muted/30">
                              {mod.submodules.map(sub => (
                                <div key={sub.key} className="flex items-center justify-between py-1.5 pl-6">
                                  <span className="text-sm text-muted-foreground">{sub.label}</span>
                                  <Switch
                                    checked={(modules[sub.key] ?? true) && isParentActive}
                                    onCheckedChange={(checked) => toggleModule(sub.key, checked)}
                                    disabled={saving || !isParentActive}
                                  />
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        )}
                      </div>
                    </Collapsible>
                  );
                })}
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
