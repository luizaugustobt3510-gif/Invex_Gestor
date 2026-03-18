import { supabase } from '@/integrations/supabase/client';

export const hardDeleteById = async (table: string, id: string) => {
  const query = supabase.from(table as never) as any;
  const { data, error } = await query.delete().eq('id', id).select('id').maybeSingle();

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  if (!data?.id) {
    return {
      success: false,
      message: 'O registro não foi excluído. Verifique sua permissão ou tente novamente.',
    };
  }

  return {
    success: true,
    deletedId: data.id as string,
  };
};
