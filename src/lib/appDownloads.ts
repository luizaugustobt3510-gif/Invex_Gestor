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
  const name = d.file_path.split('/').pop() || 'app.apk';
  const { data, error } = await supabase.storage.from(APP_DOWNLOADS_BUCKET).createSignedUrl(d.file_path, 600, { download: name });
  if (error || !data) throw error ?? new Error('Falha ao gerar link');
  window.location.href = data.signedUrl;
}
