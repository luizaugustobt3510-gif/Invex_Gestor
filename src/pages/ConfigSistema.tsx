import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save, RefreshCw } from 'lucide-react';

const ConfigSistema = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});

  const fetchConfig = async () => {
    setLoading(true);
    const { data } = await supabase.from('system_config').select('config_key, config_value');
    const map: Record<string, string> = {};
    (data || []).forEach(d => { map[d.config_key] = d.config_value || ''; });
    setConfig(map);
    setLoading(false);
  };

  useEffect(() => { fetchConfig(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(config)) {
        await supabase
          .from('system_config')
          .upsert({ config_key: key, config_value: value }, { onConflict: 'config_key' });
      }
      toast({ title: 'Configurações salvas!' });
    } catch {
      toast({ title: 'Erro', description: 'Erro ao salvar configurações.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Carregando...
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Sistema</Label>
            <Input
              value={config.system_name || ''}
              onChange={e => setConfig(prev => ({ ...prev, system_name: e.target.value }))}
              placeholder="Invex"
            />
          </div>
          <div className="space-y-2">
            <Label>Cor Principal (hex)</Label>
            <div className="flex gap-2">
              <Input
                value={config.primary_color || ''}
                onChange={e => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                placeholder="#1B5E20"
              />
              <div
                className="w-10 h-10 rounded border shrink-0"
                style={{ backgroundColor: config.primary_color || '#1B5E20' }}
              />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default ConfigSistema;
