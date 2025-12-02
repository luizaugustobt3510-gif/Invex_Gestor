import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  nome: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, senha: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx0_BygXBmPN7YOnbKv5i0mjrgoVHBLaWEZP8uAdbBbeQyhJ-6qbjRbEFxTl3wQE9Q/exec';

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
    // Validação de campos vazios
    if (!email || !email.trim()) {
      return { success: false, message: 'Por favor, informe o e-mail.' };
    }
    
    if (!senha || !senha.trim()) {
      return { success: false, message: 'Por favor, informe a senha.' };
    }

    // Validação básica de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return { success: false, message: 'Por favor, informe um e-mail válido.' };
    }

    try {
      // Buscar dados da planilha via GET
      const response = await fetch(GOOGLE_SHEETS_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return { success: false, message: 'Erro ao conectar com o servidor. Tente novamente.' };
      }

      const data = await response.json();
      
      // Verificar se há dados de usuários na resposta
      if (!data.usuarios || !Array.isArray(data.usuarios)) {
        return { success: false, message: 'Erro ao carregar dados de autenticação.' };
      }

      // Procurar o usuário pelo e-mail (case insensitive)
      const normalizedEmail = email.trim().toLowerCase();
      const foundUser = data.usuarios.find(
        (u: { email: string; senha: string; nome: string }) => 
          u.email && u.email.toLowerCase() === normalizedEmail
      );

      if (!foundUser) {
        return { success: false, message: 'E-mail não encontrado. Verifique e tente novamente.' };
      }

      // Verificar a senha (comparação exata)
      if (foundUser.senha !== senha) {
        return { success: false, message: 'Senha incorreta. Verifique e tente novamente.' };
      }

      // Login bem-sucedido
      const userData: User = {
        nome: foundUser.nome || 'Usuário',
        email: foundUser.email
      };
      
      setUser(userData);
      localStorage.setItem('invex_user', JSON.stringify(userData));
      
      return { success: true, message: `Bem-vindo, ${userData.nome}!` };
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, message: 'Erro ao realizar login. Verifique sua conexão.' };
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