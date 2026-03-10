import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import DashboardLogistica from "./DashboardLogistica";
import DashboardSuperAdmin from "./DashboardSuperAdmin";

const Index = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  // SuperAdmin → painel de gestão da plataforma (sem dashboards operacionais)
  if (user.role === 'superadm') return <DashboardSuperAdmin />;

  // RH / Visualizador → Dashboard RH
  if (user.role === 'rh' || user.role === 'visualizador') return <Navigate to="/rh" replace />;

  // Logística, admin, etc → Logistics dashboard
  return <DashboardLogistica />;
};

export default Index;
