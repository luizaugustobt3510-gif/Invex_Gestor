import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useModuleAccess } from '@/hooks/useModuleAccess';

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  moduleKey?: string;
  submoduleKey?: string;
}

export const RoleProtectedRoute = ({ children, allowedRoles, moduleKey, submoduleKey }: RoleProtectedRouteProps) => {
  const { user, isLoading, hasPermission } = useAuth();
  const { canAccessModule, loading: moduleLoading } = useModuleAccess();

  if (isLoading || moduleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(allowedRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  // Check parent module
  if (moduleKey && !canAccessModule(moduleKey)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Módulo Indisponível</h1>
          <p className="text-muted-foreground">Este módulo não está ativo para sua empresa ou seu usuário.</p>
        </div>
      </div>
    );
  }

  // Check submodule (composite key: "module.submodule")
  if (submoduleKey && !canAccessModule(submoduleKey)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Submódulo Indisponível</h1>
          <p className="text-muted-foreground">Este submódulo não está ativo para sua empresa.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
