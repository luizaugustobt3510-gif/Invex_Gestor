import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const FITNESS_COMPANY_ID = "f54ebd25-21cc-43e8-888f-ffbbed1d4b7f";

interface Props {
  children: ReactNode;
}

/**
 * Restringe acesso ao Invex Fitness:
 * - Só usuários cuja company_id seja exatamente a empresa "Invex Fitness"
 * - Ou super_admin para gestão
 */
export const FitnessProtectedRoute = ({ children }: Props) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/fitness/login" replace />;

  const isAllowed = user.role === "superadm" || user.companyId === FITNESS_COMPANY_ID;

  if (!isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-6">
          <h1 className="text-2xl font-bold text-destructive mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground">
            O Invex Fitness é exclusivo para usuários vinculados à empresa Invex Fitness.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
