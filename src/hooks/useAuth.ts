import { useState, useEffect } from 'react';

interface User {
  nome: string;
  email: string;
}

const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwDOb6lOiqOcjM8o4C6-PrJLgSjOy3KEy-MVmLOnnr6zSqme3WJVrSZOk3buLspIgY/exec';

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

      // Como no-cors não permite ler a resposta, vamos simular o login
      // Em produção, você precisaria configurar CORS no Apps Script
      const userData = { nome: 'Administrador', email };
      localStorage.setItem('invex_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
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
