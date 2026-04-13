import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ABCResult {
  material: string;
  classe: 'A' | 'B' | 'C';
  compraSugerida: number;
  consumoMensal: number;
  estoqueIdeal?: number;
  consumoTotal?: number;
  valorTotal?: number;
  percentual?: number;
  percentualAcumulado?: number;
  estoqueAtual?: number;
}

interface ABCConfig {
  limiteA: number;
  limiteB: number;
  leadTime: number;
  estoqueSeguranca: number;
  periodo: number;
}

interface RawRow {
  material: string;
  quantidade: number;
  total: number;
  unidade?: string;
  destino?: string;
  data?: string;
  valorUnitario?: number;
}

const defaultConfig: ABCConfig = {
  limiteA: 80,
  limiteB: 95,
  leadTime: 15,
  estoqueSeguranca: 7,
  periodo: 12,
};

export function useCurvaABCData() {
  const { user } = useAuth();
  const [results, setResults] = useState<ABCResult[]>([]);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [config, setConfig] = useState<ABCConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (!profile?.company_id) {
          setLoading(false);
          return;
        }

        setCompanyId(profile.company_id);

        const { data, error } = await supabase
          .from('curva_abc_data' as any)
          .select('*')
          .eq('company_id', profile.company_id)
          .maybeSingle();

        if (error) {
          console.error('Error loading curva ABC data:', error);
          loadFromLocalStorage();
        } else if (data) {
          const row = data as any;
          setRawRows(row.raw_rows || []);
          setConfig({ ...defaultConfig, ...(row.config || {}) });
          setResults(row.results || []);
        } else {
          loadFromLocalStorage();
        }
      } catch (e) {
        console.error('Error:', e);
        loadFromLocalStorage();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const loadFromLocalStorage = () => {
    try {
      const savedRows = localStorage.getItem('invex_curva_abc_data');
      const savedConfig = localStorage.getItem('invex_curva_abc_config');
      const savedResults = localStorage.getItem('invex_curva_abc_results');
      if (savedRows) setRawRows(JSON.parse(savedRows));
      if (savedConfig) setConfig({ ...defaultConfig, ...JSON.parse(savedConfig) });
      if (savedResults) setResults(JSON.parse(savedResults));
    } catch { /* silent */ }
  };

  const save = useCallback(async (newRawRows: RawRow[], newConfig: ABCConfig, newResults: ABCResult[]) => {
    setRawRows(newRawRows);
    setConfig(newConfig);
    setResults(newResults);

    localStorage.setItem('invex_curva_abc_data', JSON.stringify(newRawRows));
    localStorage.setItem('invex_curva_abc_config', JSON.stringify(newConfig));
    localStorage.setItem('invex_curva_abc_results', JSON.stringify(newResults));

    if (!companyId) return;

    try {
      const payload = {
        company_id: companyId,
        raw_rows: newRawRows as any,
        config: newConfig as any,
        results: newResults as any,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('curva_abc_data' as any)
        .upsert(payload, { onConflict: 'company_id' });

      if (error) {
        console.error('Error saving curva ABC:', error);
      }
    } catch (e) {
      console.error('Error saving curva ABC:', e);
    }
  }, [companyId]);

  const reset = useCallback(async () => {
    setRawRows([]);
    setConfig(defaultConfig);
    setResults([]);
    localStorage.removeItem('invex_curva_abc_data');
    localStorage.removeItem('invex_curva_abc_config');
    localStorage.removeItem('invex_curva_abc_results');

    if (!companyId) return;

    try {
      await supabase
        .from('curva_abc_data' as any)
        .delete()
        .eq('company_id', companyId);
    } catch (e) {
      console.error('Error resetting curva ABC:', e);
    }
  }, [companyId]);

  return {
    results,
    rawRows,
    config,
    loading,
    save,
    reset,
    defaultConfig,
  };
}

export type { ABCResult, ABCConfig, RawRow };
