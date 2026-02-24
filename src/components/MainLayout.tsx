import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Download, Menu, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MainLayoutProps {
  children: ReactNode;
  onExportReport?: () => void;
  showExport?: boolean;
  showQRCode?: boolean;
}

export function MainLayout({ children, onExportReport, showExport = false, showQRCode = false }: MainLayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Top bar */}
          <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8">
                <Menu className="h-4 w-4" />
              </SidebarTrigger>
              <span className="text-sm font-medium text-muted-foreground hidden sm:block">
                {user?.nome && `Olá, ${user.nome.split(' ')[0]}`}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {showQRCode && (
                <Button 
                  onClick={() => navigate('/gerar-qrcode')}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  <span className="hidden sm:inline">Gerar QR Code</span>
                </Button>
              )}
              {showExport && onExportReport && (
                <Button 
                  onClick={onExportReport}
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              )}
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
