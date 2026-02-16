import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface InventoryItem {
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

interface InventoryResponse {
  resumo: InventorySummary;
  produtos: InventoryItem[];
}

const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx0_BygXBmPN7YOnbKv5i0mjrgoVHBLaWEZP8uAdbBbeQyhJ-6qbjRbEFxTl3wQE9Q/exec';

export const useInventoryData = () => {
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
      
      const response = await fetch(GOOGLE_SHEETS_URL);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar dados do Google Sheets');
      }
      
      const text = await response.text();
      
      if (text.startsWith('Erro:')) {
        throw new Error(text);
      }
      
      try {
        const jsonData: InventoryResponse = JSON.parse(text);
        setData(jsonData.produtos || []);
        setSummary(jsonData.resumo || summary);
      } catch {
        throw new Error('Resposta inválida do servidor. Verifique a configuração do Google Apps Script.');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error('Erro ao carregar dados do estoque', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (codigo: string, quantidade: number) => {
    try {
      const response = await fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: 'update',
          codigo: codigo.toString(),
          quantidade: Number(quantidade)
        })
      });

      if (!response.ok) {
        throw new Error('Erro na requisição');
      }

      toast.success('Estoque atualizado com sucesso!');
      setTimeout(() => fetchData(), 1000);
      return { success: true };
    } catch {
      toast.error('Erro ao atualizar estoque');
      return { success: false };
    }
  };

  const massUpdate = async (user: string, produtos: Array<{ codigo: string; quantidade: string }>) => {
    try {
      const response = await fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: 'mass_update',
          user,
          produtos: produtos.map(p => ({
            codigo: p.codigo.toString(),
            quantidade: p.quantidade
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Erro na requisição');
      }

      toast.success('Atualização em massa concluída!');
      setTimeout(() => fetchData(), 1000);
      return { success: true };
    } catch {
      toast.error('Erro ao atualizar estoque em massa');
      return { success: false };
    }
  };

  const movimentarEstoque = async (
    user: string, 
    tipo: 'entrada' | 'saida', 
    produtos: Array<{ codigo: string; quantidade: string; obs: string }>
  ) => {
    try {
      const response = await fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: 'movimentar',
          user,
          tipo,
          produtos: produtos.map(p => ({
            codigo: p.codigo.toString(),
            quantidade: p.quantidade,
            obs: p.obs
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Erro na requisição');
      }

      toast.success(`Movimentação de ${tipo} concluída!`);
      setTimeout(() => fetchData(), 1000);
      return { success: true };
    } catch {
      toast.error('Erro ao movimentar estoque');
      return { success: false };
    }
  };

  useEffect(() => {
    fetchData();
    
    // Atualiza a cada 5 minutos (300000ms)
    const interval = setInterval(fetchData, 300000);
    
    return () => clearInterval(interval);
  }, []);

  return { 
    data, 
    summary, 
    loading, 
    error, 
    refetch: fetchData, 
    updateStock,
    massUpdate,
    movimentarEstoque
  };
};
