import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// DB roles from app_role enum
type DbRole = 'super_admin' | 'admin_empresa' | 'usuario_almox' | 'solicitante' | 'logistica' | 'rh' | 'financeiro' | 'visualizador' | 'manutencao' | 'fitness_user' | 'clinica' | 'enfermagem' | 'enfermeiro' | 'recepcionista';

// UI roles used throughout the app
export type UserRole = 'superadm' | 'admin' | 'usuario almox' | 'solicitante' | 'logistica' | 'rh' | 'financeiro' | 'visualizador' | 'manutencao' | 'fitness' | 'clinica' | 'enfermagem' | 'enfermeiro' | 'recepcionista';

const dbToUiRole: Record<DbRole, UserRole> = {
  super_admin: 'superadm',
  admin_empresa: 'admin',
  usuario_almox: 'usuario almox',
  solicitante: 'solicitante',
  logistica: 'logistica',
  rh: 'rh',
  financeiro: 'financeiro',
  visualizador: 'visualizador',
  manutencao: 'manutencao',
  fitness_user: 'fitness',
  clinica: 'clinica',
  enfermagem: 'enfermagem',
  enfermeiro: 'enfermeiro',
  recepcionista: 'recepcionista',
};

interface User {
  nome: string;
  email: string;
  role: UserRole;
  companyId: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, senha: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isLoading: boolean;
  hasPermission: (allowedRoles: UserRole[]) => boolean;
  setAfkBlocked: (blocked: boolean) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadUserProfile(supabaseUser: SupabaseUser): Promise<User | null> {
  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, email, company_id')
    .eq('user_id', supabaseUser.id)
    .single();

  // Get role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, company_id')
    .eq('user_id', supabaseUser.id)
    .limit(1)
    .single();

  const dbRole = (roleData?.role as DbRole) || 'solicitante';

  return {
    nome: profile?.nome || supabaseUser.user_metadata?.nome || supabaseUser.email?.split('@')[0] || 'Usuário',
    email: profile?.email || supabaseUser.email || '',
    role: dbToUiRole[dbRole] || 'solicitante',
    companyId: roleData?.company_id || profile?.company_id || null,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [afkBlocked, setAfkBlocked] = useState(false);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutos

  const performLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  // Inactivity auto-logout (desabilitado durante treino ativo)
  useEffect(() => {
    if (!user || afkBlocked) {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      return;
    }

    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        performLogout();
      }, INACTIVITY_TIMEOUT);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user, afkBlocked, performLogout]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setTimeout(async () => {
          const profile = await loadUserProfile(session.user);
          setUser(profile);
          setIsLoading(false);
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await loadUserProfile(session.user);
        setUser(profile);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, senha: string): Promise<{ success: boolean; message: string }> => {
    const emailNormalizado = email.trim().toLowerCase();
    const senhaNormalizada = String(senha).trim();

    if (!emailNormalizado) return { success: false, message: 'Por favor, informe o e-mail.' };
    if (!senhaNormalizada) return { success: false, message: 'Por favor, informe a senha.' };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalizado)) return { success: false, message: 'Por favor, informe um e-mail válido.' };

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailNormalizado,
        password: senhaNormalizada,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, message: 'E-mail ou senha incorretos.' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { success: false, message: 'E-mail não confirmado. Verifique sua caixa de entrada.' };
        }
        return { success: false, message: error.message };
      }

      if (data.user) {
        const profile = await loadUserProfile(data.user);

        // Subscription block check (skip super admin)
        if (profile && profile.role !== 'superadm' && profile.companyId) {
          try {
            const { data: statusData } = await supabase.rpc('evaluate_subscription_status', {
              _company_id: profile.companyId,
            });
            if (statusData === 'bloqueada') {
              await supabase.auth.signOut();
              return {
                success: false,
                message: 'Assinatura da empresa vencida. Entre em contato com o administrador para regularizar o acesso.',
              };
            }
          } catch { /* silent — do not block login on RPC error */ }
        }

        setUser(profile);
        return { success: true, message: `Bem-vindo, ${profile?.nome || 'Usuário'}!` };
      }

      return { success: false, message: 'Erro inesperado no login.' };
    } catch {
      return { success: false, message: 'Erro ao realizar login. Verifique sua conexão.' };
    }
  };

  const logout = performLogout;

  const hasPermission = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, hasPermission, setAfkBlocked }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
