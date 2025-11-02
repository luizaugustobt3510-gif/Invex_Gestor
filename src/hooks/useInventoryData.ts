import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  current: number;
  minimum: number;
  maximum: number;
  unit: string;
}

const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzdOamEJhLocYbu3h6jqObIb4CNHiP44-QutumzBPRakYrIqk9BQoP3AmHtrs9CmtM/exec';

export const useInventoryData = () => {
  const [data, setData] = useState<InventoryItem[]>([]);
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
      
      const jsonData = await response.json();
      setData(jsonData);
      
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

  useEffect(() => {
    fetchData();
    
    // Atualiza a cada 30 segundos
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refetch: fetchData };
};
