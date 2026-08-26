import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MaterialGroup {
  id: string;
  company_id: string;
  nome: string;
  descricao: string | null;
}

const DEFAULT_GROUPS = ['Medicamentos', 'Materiais Médicos', 'Limpeza', 'Escritório', 'Outros'];

export const useMaterialGroups = () => {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [groups, setGroups] = useState<MaterialGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) { setGroups([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase.from('material_groups' as any) as any)
      .select('*').eq('company_id', companyId).order('nome');
    if (error) toast.error('Erro ao carregar grupos', { description: error.message });
    setGroups(((data || []) as any) as MaterialGroup[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const createGroup = async (nome: string, descricao?: string) => {
    if (!companyId) return null;
    const { data, error } = await (supabase.from('material_groups' as any) as any)
      .insert({ company_id: companyId, nome: nome.trim(), descricao: descricao?.trim() || null })
      .select().single();
    if (error) { toast.error('Erro ao criar grupo', { description: error.message }); return null; }
    await load();
    return data as MaterialGroup;
  };

  const updateGroup = async (id: string, nome: string, descricao?: string) => {
    const { error } = await (supabase.from('material_groups' as any) as any)
      .update({ nome: nome.trim(), descricao: descricao?.trim() || null }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar grupo', { description: error.message }); return false; }
    await load();
    return true;
  };

  const deleteGroup = async (id: string) => {
    const { error } = await (supabase.from('material_groups' as any) as any).delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir grupo', { description: error.message }); return false; }
    await load();
    return true;
  };

  /** Cria os grupos padrão que ainda não existem. */
  const seedDefaults = async () => {
    if (!companyId) return;
    const existing = new Set(groups.map(g => g.nome.toLowerCase()));
    const rows = DEFAULT_GROUPS.filter(n => !existing.has(n.toLowerCase()))
      .map(nome => ({ company_id: companyId, nome }));
    if (rows.length === 0) { toast.info('Grupos padrão já cadastrados'); return; }
    const { error } = await (supabase.from('material_groups' as any) as any).insert(rows);
    if (error) { toast.error('Erro ao criar grupos padrão', { description: error.message }); return; }
    toast.success(`${rows.length} grupo(s) criado(s)`);
    await load();
  };

  return { groups, loading, refetch: load, createGroup, updateGroup, deleteGroup, seedDefaults };
};
