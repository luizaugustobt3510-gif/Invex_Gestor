import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type PublicTable = keyof Database['public']['Tables'];

export const hardDeleteById = async <T extends PublicTable>(table: T, id: string) => {
  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  if (!data) {
    return {
      success: false,
      message: 'O registro não foi excluído. Verifique sua permissão ou tente novamente.',
    };
  }

  return {
    success: true,
    deletedId: data.id,
  };
};
