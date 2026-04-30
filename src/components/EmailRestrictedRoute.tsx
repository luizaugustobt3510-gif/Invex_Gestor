import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  allowedEmails: string[];
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Restringe o acesso a uma rota a uma lista específica de e-mails.
 * Útil para módulos em desenvolvimento liberados apenas para testers.
 */
export const EmailRestrictedRoute = ({ allowedEmails, children, redirectTo = '/' }: Props) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const allow = allowedEmails.map(e => e.toLowerCase()).includes((user.email || '').toLowerCase());
  if (!allow) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
};
