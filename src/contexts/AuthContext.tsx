import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: { nome: string; email: string } | null;
  login: (email: string, senha: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx0_BygXBmPN7YOnbKv5i0mjrgoVHBLaWEZP8uAdbBbeQyhJ-6qbjRbEFxTl3wQE9Q/exec';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ nome: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se há usuário no localStorage
    const storedUser = localStorage.getItem('invex_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, senha: string) => {
    try {
      const response = await fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          email,
          senha
        })
      });

      // Como está em no-cors, não conseguimos ler a resposta
      // Por enquanto, vamos simular o login para demonstração
      // Em produção, você precisaria configurar CORS no Apps Script
      
      // Simulação de login bem-sucedido
      const userData = { nome: 'Admin', email };
      setUser(userData);
      localStorage.setItem('invex_user', JSON.stringify(userData));
      
      return { success: true, message: 'Login realizado com sucesso!' };
    } catch (error) {
      return { success: false, message: 'Erro ao realizar login. Tente novamente.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('invex_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
