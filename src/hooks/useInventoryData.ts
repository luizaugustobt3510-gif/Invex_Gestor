import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface InventoryItem {
  id: string;
  codigo: string;
  material: string;
  unidade: string;
  localizacao: string;
  validade: string;
  quantidade: number;
  minimo: number;
  maximo: number;
  preco: number;
  valorTotal: number;
  status: string;
  curva: string;
}

export interface InventorySummary {
  total_itens: number;
  total_estoque_valor: number;
  total_ok: number;
  total_abaixo: number;
  total_zerado: number;
  curvaA: number;
  curvaB: number;
  curvaC: number;
}

const classifyCurva = (items: InventoryItem[]): InventoryItem[] => {
  const sorted = [...items].sort((a, b) => b.valorTotal - a.valorTotal);
  const totalValue = sorted.reduce((sum, item) => sum + item.valorTotal, 0);
  let cumulative = 0;
  return sorted.map(item => {
    cumulative += item.valorTotal;
    const pct = totalValue > 0 ? (cumulative / totalValue) * 100 : 0;
    let curva = 'C';
    if (pct <= 80) curva = 'A';
    else if (pct <= 95) curva = 'B';
    return { ...item, curva };
  });
};

export const useInventoryData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    total_itens: 0,
    total_estoque_valor: 0,
    total_ok: 0,
    total_abaixo: 0,
    total_zerado: 0,
    curvaA: 0,
    curvaB: 0,
    curvaC: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .not('company_id', 'is', null)
        .limit(1)
        .single();

      if (!roleData?.company_id) throw new Error('Empresa não encontrada');

      const { data: materials, error: matError } = await supabase
        .from('materials')
        .select('*')
        .eq('company_id', roleData.company_id)
        .order('codigo');

      if (matError) throw matError;

      let items: InventoryItem[] = (materials || []).map(m => {
        const qty = Number(m.quantidade);
        const min = Number(m.minimo);
        const preco = Number(m.preco);
        let status = 'OK';
        if (qty === 0) status = 'Zerado';
        else if (qty < min) status = 'Abaixo do Mínimo';

        return {
          id: m.id,
          codigo: m.codigo,
          material: m.material,
          unidade: m.unidade,
          localizacao: m.localizacao || '',
          validade: m.validade || '',
          quantidade: qty,
          minimo: min,
          maximo: Number(m.maximo),
          preco,
          valorTotal: qty * preco,
          status,
          curva: 'C',
        };
      });

      items = classifyCurva(items);

      const sum: InventorySummary = {
        total_itens: items.length,
        total_estoque_valor: items.reduce((s, i) => s + i.valorTotal, 0),
        total_ok: items.filter(i => i.status === 'OK').length,
        total_abaixo: items.filter(i => i.status === 'Abaixo do Mínimo').length,
        total_zerado: items.filter(i => i.status === 'Zerado').length,
        curvaA: items.filter(i => i.curva === 'A').length,
        curvaB: items.filter(i => i.curva === 'B').length,
        curvaC: items.filter(i => i.curva === 'C').length,
      };

      setData(items);
      setSummary(sum);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error('Erro ao carregar dados do estoque', { description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (codigo: string, quantidade: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .not('company_id', 'is', null)
        .limit(1)
        .single();

      if (!roleData?.company_id) throw new Error('Empresa não encontrada');

      const { error } = await supabase
        .from('materials')
        .update({ quantidade })
        .eq('company_id', roleData.company_id)
        .eq('codigo', codigo);

      if (error) throw error;

      toast.success('Estoque atualizado com sucesso!');
      await fetchData();
      return { success: true };
    } catch {
      toast.error('Erro ao atualizar estoque');
      return { success: false };
    }
  };

  useEffect(() => {
    setData([]);
    setSummary({ total_itens: 0, total_estoque_valor: 0, total_ok: 0, total_abaixo: 0, total_zerado: 0, curvaA: 0, curvaB: 0, curvaC: 0 });
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [user?.companyId, user?.email]);

  return { data, summary, loading, error, refetch: fetchData, updateStock };
};
