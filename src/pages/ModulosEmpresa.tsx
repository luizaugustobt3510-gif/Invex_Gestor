import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Puzzle, RefreshCw, ChevronDown, Sparkles } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MODULES_CATALOG } from '@/config/modules';
import {
  COMPANY_TYPES,
  COMPANY_TYPE_LABELS,
  COMPANY_TYPE_TEMPLATES,
  type CompanyType,
} from '@/config/companyTypeTemplates';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Tela do ADMIN DA EMPRESA para gerenciar os módulos da própria empresa.
 * (SuperAdmin continua tendo /gestao-modulos com seletor de empresa.)
 *
 * Regras:
 *  - Desativar um módulo apenas oculta menus / bloqueia rotas — dados permanecem.
 *  - Reativar restaura o acesso e o conteúdo existente.
 *  - Aplicar template é aditivo (nunca desativa).
 */
const ModulosEmpresa = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [companyType, setCompanyType] = useState<CompanyType>('personalizado');
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateDialog, setTemplateDialog] = useState(false);

  useEffect(() => {
    if (!user?.companyId) return;
    const load = async () => {
      setLoading(true);
      const [companyRes, modulesRes] = await Promise.all([
        supabase.from('companies').select('company_type').eq('id', user.companyId!).maybeSingle(),
        supabase.from('company_modules').select('module_key, is_active').eq('company_id', user.companyId!),
      ]);

      const type = ((companyRes.data as any)?.company_type as CompanyType) || 'personalizado';
      setCompanyType(COMPANY_TYPES.includes(type) ? type : 'personalizado');

      const state: Record<string, boolean> = {};
      MODULES_CATALOG.forEach((m) => {
        state[m.key] = true;
        m.submodules.forEach((s) => {
          state[s.key] = true;
        });
      });
      (modulesRes.data || []).forEach((r) => {
        state[r.module_key] = r.is_active;
      });
      setModules(state);
      setLoading(false);
    };
    load();
  }, [user?.companyId]);

  const toggleModule = async (moduleKey: string, active: boolean) => {
    if (!user?.companyId) return;
    setModules((prev) => ({ ...prev, [moduleKey]: active }));
    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_modules')
        .upsert(
          { company_id: user.companyId, module_key: moduleKey, is_active: active },
          { onConflict: 'company_id,module_key' },
        );
      if (error) throw error;
      toast({ title: active ? 'Módulo ativado' : 'Módulo desativado (dados preservados)' });
    } catch {
      setModules((prev) => ({ ...prev, [moduleKey]: !active }));
      toast({ title: 'Erro ao atualizar módulo', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveCompanyType = async (type: CompanyType) => {
    if (!user?.companyId) return;
    const previous = companyType;
    setCompanyType(type);
    const { data, error } = await supabase
      .from('companies')
      .update({ company_type: type } as any)
      .eq('id', user.companyId)
      .select('id');
    if (error || !data || data.length === 0) {
      setCompanyType(previous);
      toast({
        title: 'Erro ao salvar tipo de empresa',
        description: error?.message || 'Você não tem permissão para alterar o tipo desta empresa.',
        variant: 'destructive',
      });
    } else {
      toast({ title: `Tipo definido: ${COMPANY_TYPE_LABELS[type]}` });
    }
  };

  /** Ativa (upsert=true) apenas os módulos do template — nunca desativa. */
  const applyTemplate = async () => {
    if (!user?.companyId) return;
    const suggested = COMPANY_TYPE_TEMPLATES[companyType] || [];
    if (suggested.length === 0) {
      toast({ title: 'Este tipo não sugere módulos', description: 'Ative manualmente.' });
      setTemplateDialog(false);
      return;
    }
    setSaving(true);
    try {
      const rows = suggested.map((key) => ({
        company_id: user.companyId!,
        module_key: key,
        is_active: true,
      }));
      const { error } = await supabase
        .from('company_modules')
        .upsert(rows, { onConflict: 'company_id,module_key' });
      if (error) throw error;
      setModules((prev) => {
        const next = { ...prev };
        suggested.forEach((k) => (next[k] = true));
        return next;
      });
      toast({ title: 'Template aplicado', description: `${suggested.length} módulo(s) ativado(s).` });
    } catch {
      toast({ title: 'Erro ao aplicar template', variant: 'destructive' });
    } finally {
      setSaving(false);
      setTemplateDialog(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Puzzle className="w-5 h-5" />
              Módulos do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label>Tipo de Empresa (apenas sugestão)</Label>
                <Select value={companyType} onValueChange={(v) => saveCompanyType(v as CompanyType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPANY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{COMPANY_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  O tipo de empresa é apenas um rótulo. Nenhum módulo é ativado/desativado automaticamente ao trocar.
                  Use o botão "Aplicar template" para ativar a sugestão inicial (nunca desativa nada).
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setTemplateDialog(true)}
                disabled={saving || companyType === 'personalizado'}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Aplicar template
              </Button>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p>• Ativar/desativar um módulo apenas mostra ou oculta funcionalidades — nenhum dado é apagado.</p>
              <p>• Permissões por perfil são configuradas em <strong>Gestão de Perfis</strong>.</p>
            </div>


            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Carregando módulos...
              </div>
            ) : (
              <div className="space-y-3">
                {MODULES_CATALOG.map((mod) => {
                  const parentActive = modules[mod.key] ?? true;
                  return (
                    <Collapsible key={mod.key} className="group/mod">
                      <div className="rounded-lg border">
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
                            checked={parentActive}
                            onCheckedChange={(c) => toggleModule(mod.key, c)}
                            disabled={saving}
                          />
                        </div>

                        {mod.submodules.length > 0 && (
                          <CollapsibleContent>
                            <div className="border-t px-4 py-2 space-y-2 bg-muted/30">
                              {mod.submodules.map((sub) => (
                                <div key={sub.key} className="flex items-center justify-between py-1.5 pl-6">
                                  <span className="text-sm text-muted-foreground">{sub.label}</span>
                                  <Switch
                                    checked={(modules[sub.key] ?? true) && parentActive}
                                    onCheckedChange={(c) => toggleModule(sub.key, c)}
                                    disabled={saving || !parentActive}
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
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar template "{COMPANY_TYPE_LABELS[companyType]}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso ativará os módulos sugeridos ({(COMPANY_TYPE_TEMPLATES[companyType] || []).join(', ') || '—'}).
              Nenhum módulo já ativo será desativado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={applyTemplate}>Aplicar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default ModulosEmpresa;
