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

const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwDOb6lOiqOcjM8o4C6-PrJLgSjOy3KEy-MVmLOnnr6zSqme3WJVrSZOk3buLspIgY/exec';

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
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          codigo,
          quantidade
        })
      });

      toast.success('Estoque atualizado com sucesso!');
      await fetchData();
      return { success: true };
    } catch (error) {
      toast.error('Erro ao atualizar estoque');
      return { success: false };
    }
  };

  useEffect(() => {
    fetchData();
    
    // Atualiza a cada 5 minutos (300000ms)
    const interval = setInterval(fetchData, 300000);
    
    return () => clearInterval(interval);
  }, []);

  return { data, summary, loading, error, refetch: fetchData, updateStock };
};
