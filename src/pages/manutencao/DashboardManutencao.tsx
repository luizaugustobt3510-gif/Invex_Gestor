import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench } from 'lucide-react';

const DashboardManutencao = () => {
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Manutenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Módulo de Manutenção em construção. Em breve novas funcionalidades estarão disponíveis.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DashboardManutencao;
