import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import DashboardSuperAdmin from "./DashboardSuperAdmin";
import DashboardEmpresa from "./DashboardEmpresa";

const Index = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  // SuperAdmin → platform management only
  if (user.role === 'superadm') return <DashboardSuperAdmin />;

  // Solicitante → go to solicitations directly
  if (user.role === 'solicitante') return <Navigate to="/solicitar-material" replace />;

  // All other roles → Global company dashboard (consolidates active modules)
  return <DashboardEmpresa />;
};

export default Index;
