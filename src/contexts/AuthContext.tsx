import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/services/api';

export type UserRole = 'superadm' | 'admin' | 'usuario almox' | 'solicitante';

interface User {
  nome: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, senha: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isLoading: boolean;
  hasPermission: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('invex_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('invex_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, senha: string): Promise<{ success: boolean; message: string }> => {
    const emailNormalizado = email.trim().toLowerCase();
    const senhaNormalizada = String(senha).trim();

    if (!emailNormalizado) {
      return { success: false, message: 'Por favor, informe o e-mail.' };
    }
    
    if (!senhaNormalizada) {
      return { success: false, message: 'Por favor, informe a senha.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalizado)) {
      return { success: false, message: 'Por favor, informe um e-mail válido.' };
    }

    try {
      console.log('=== LOGIN DEBUG ===');
      console.log('Email:', emailNormalizado);
      
      const response = await api.login(emailNormalizado, senhaNormalizada);
      
      console.log('Resposta da API:', response);

      if (response.ok === true) {
        const userData: User = {
          nome: response.nome || 'Usuário',
          email: response.email || emailNormalizado,
          role: (response.role as UserRole) || 'solicitante',
        };
        
        console.log('✅ Login bem-sucedido:', userData);
        
        setUser(userData);
        localStorage.setItem('invex_user', JSON.stringify(userData));
        
        return { success: true, message: `Bem-vindo, ${userData.nome}!` };
      } else {
        console.log('❌ Login falhou:', response.msg);
        return { success: false, message: response.msg || 'E-mail ou senha incorretos.' };
      }
    } catch (error) {
      console.error('❌ Erro no login:', error);
      return { success: false, message: 'Erro ao realizar login. Verifique sua conexão.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('invex_user');
  };

  const hasPermission = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, hasPermission }}>
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
