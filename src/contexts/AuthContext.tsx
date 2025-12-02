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
    // Normalização dos inputs
    const emailNormalizado = email.trim().toLowerCase();
    const senhaNormalizada = String(senha).trim();

    console.log('=== DEBUG LOGIN ===');
    console.log('Email digitado (normalizado):', emailNormalizado);
    console.log('Senha digitada (normalizada):', senhaNormalizada);

    // Validação de campos vazios
    if (!emailNormalizado) {
      console.log('❌ Erro: E-mail vazio');
      return { success: false, message: 'Por favor, informe o e-mail.' };
    }
    
    if (!senhaNormalizada) {
      console.log('❌ Erro: Senha vazia');
      return { success: false, message: 'Por favor, informe a senha.' };
    }

    // Validação básica de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalizado)) {
      console.log('❌ Erro: Formato de e-mail inválido');
      return { success: false, message: 'Por favor, informe um e-mail válido.' };
    }

    try {
      // Tentar POST com action login
      console.log('📡 Enviando requisição POST para login...');
      
      const response = await fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: 'login',
          email: emailNormalizado,
          senha: senhaNormalizada
        })
      });

      console.log('📡 Status da resposta:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📡 Dados recebidos:', data);
        
        if (data.ok === true) {
          console.log('✅ Login bem-sucedido via API');
          const userData: User = {
            nome: data.nome || 'Usuário',
            email: emailNormalizado
          };
          
          setUser(userData);
          localStorage.setItem('invex_user', JSON.stringify(userData));
          
          return { success: true, message: `Bem-vindo, ${userData.nome}!` };
        } else {
          console.log('❌ Login falhou:', data.msg || 'Credenciais inválidas');
          return { success: false, message: data.msg || 'E-mail ou senha incorretos.' };
        }
      }

      // Se POST falhar, tentar buscar usuários via GET
      console.log('📡 POST falhou, tentando GET para buscar usuários...');
      
      const getResponse = await fetch(GOOGLE_SHEETS_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!getResponse.ok) {
        console.log('❌ Erro na requisição GET:', getResponse.status);
        return { success: false, message: 'Erro ao conectar com o servidor. Tente novamente.' };
      }

      const getData = await getResponse.json();
      console.log('📡 Dados GET recebidos:', Object.keys(getData));
      
      // Verificar se há dados de usuários na resposta
      if (getData.usuarios && Array.isArray(getData.usuarios)) {
        console.log('📋 Lista de usuários encontrada:', getData.usuarios.length, 'usuários');
        
        // Procurar o usuário pelo e-mail
        const foundUser = getData.usuarios.find((u: any) => {
          const emailPlanilha = String(u.email || '').trim().toLowerCase();
          console.log('  Comparando:', emailNormalizado, '===', emailPlanilha, '→', emailNormalizado === emailPlanilha);
          return emailPlanilha === emailNormalizado;
        });

        if (!foundUser) {
          console.log('❌ E-mail não encontrado na lista de usuários');
          return { success: false, message: 'E-mail não encontrado. Verifique e tente novamente.' };
        }

        console.log('✅ Usuário encontrado:', foundUser.nome || foundUser.email);
        
        // Verificar a senha (convertendo para string)
        const senhaPlanilha = String(foundUser.senha || '').trim();
        console.log('🔐 Comparando senhas:');
        console.log('  Senha digitada:', senhaNormalizada);
        console.log('  Senha planilha:', senhaPlanilha);
        console.log('  São iguais?', senhaNormalizada === senhaPlanilha);
        
        if (senhaNormalizada !== senhaPlanilha) {
          console.log('❌ Senha incorreta');
          return { success: false, message: 'Senha incorreta. Verifique e tente novamente.' };
        }

        // Login bem-sucedido
        console.log('✅ Login bem-sucedido!');
        const userData: User = {
          nome: foundUser.nome || 'Usuário',
          email: foundUser.email
        };
        
        setUser(userData);
        localStorage.setItem('invex_user', JSON.stringify(userData));
        
        return { success: true, message: `Bem-vindo, ${userData.nome}!` };
      }
      
      // Se não há usuários no GET, significa que precisamos do POST funcionando
      console.log('⚠️ Nenhuma lista de usuários encontrada no GET');
      console.log('⚠️ O Apps Script precisa retornar { ok: true/false } no POST ou { usuarios: [...] } no GET');
      
      return { success: false, message: 'Erro de configuração. Contate o administrador.' };
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
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