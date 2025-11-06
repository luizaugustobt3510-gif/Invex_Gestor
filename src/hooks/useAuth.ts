import { useState, useEffect } from 'react';

interface User {
  nome: string;
  email: string;
  admin: boolean;
}

const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx0_BygXBmPN7YOnbKv5i0mjrgoVHBLaWEZP8uAdbBbeQyhJ-6qbjRbEFxTl3wQE9Q/exec';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('invex_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, senha: string) => {
    try {
      const response = await fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          email,
          senha
        })
      });

      const data = await response.json();
      
      if (data.ok) {
        const userData = { 
          nome: data.nome, 
          email,
          admin: data.admin || false
        };
        localStorage.setItem('invex_user', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      } else {
        return { success: false, error: data.msg || 'Credenciais inválidas' };
      }
    } catch (error) {
      return { success: false, error: 'Erro ao fazer login' };
    }
  };

  const logout = () => {
    localStorage.removeItem('invex_user');
    setUser(null);
  };

  return { user, login, logout, loading };
};
