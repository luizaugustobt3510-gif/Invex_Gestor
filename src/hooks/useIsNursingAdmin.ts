import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** Admin da enfermagem = admin da empresa / super admin, ou admin de algum setor. */
export function useIsNursingAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) { setIsAdmin(false); setLoading(false); return; }
      if (user.role === 'admin' || user.role === 'superadm') { setIsAdmin(true); setLoading(false); return; }
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid || !user.companyId) { if (alive) { setIsAdmin(false); setLoading(false); } return; }
      const { data } = await supabase
        .from('sector_members' as any)
        .select('id')
        .eq('user_id', uid)
        .eq('company_id', user.companyId)
        .eq('is_admin', true)
        .limit(1);
      if (alive) { setIsAdmin(!!(data && (data as any[]).length)); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [user?.role, user?.companyId]);

  return { isNursingAdmin: isAdmin, loading };
}
