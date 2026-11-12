import { supabase } from '@/integrations/supabase/client';

export const APP_DOWNLOADS_BUCKET = 'app-downloads';

export type AppDownload = {
  id: string; titulo: string; descricao: string | null; produto: string; versao: string | null;
  file_path: string; file_size: number | null; ordem: number; ativo: boolean; created_at: string;
};

export const PRODUTOS: Record<string, string> = {
  gestor: 'Invex Gestor', rotina: 'Invex Rotina', fitness: 'Invex Fitness', financas: 'Invex Finanças',
};

export const formatSize = (b?: number | null) =>
  !b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;

export async function downloadApp(d: AppDownload) {
  const { data, error } = await supabase.functions.invoke('app-download-url', { body: { id: d.id } });
  const url = (data as { url?: string } | null)?.url;
  if (error || !url) throw error ?? new Error('Falha ao gerar link');
  window.location.href = url;
}
