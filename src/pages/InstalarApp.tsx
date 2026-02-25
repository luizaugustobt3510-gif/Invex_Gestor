import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Monitor, Apple, Chrome } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstalarApp = () => {
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast({ title: 'Invex instalado!', description: 'O app foi adicionado à sua tela inicial.' });
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Instalar Invex
            </CardTitle>
            <CardDescription>
              Instale o Invex como aplicativo no seu dispositivo para acesso rápido e experiência nativa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInstalled && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary">
                ✅ O Invex já está instalado neste dispositivo.
              </div>
            )}

            {deferredPrompt && !isInstalled && (
              <Button onClick={handleInstall} size="lg" className="w-full gap-2">
                <Download className="w-5 h-5" />
                Instalar Invex Agora
              </Button>
            )}

            {!deferredPrompt && !isInstalled && (
              <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
                O botão de instalação automática não está disponível neste navegador. Siga as instruções abaixo para instalar manualmente.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Android */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="w-5 h-5 text-primary" />
              Android (Chrome)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Abra o Invex no <strong>Google Chrome</strong></li>
              <li>Toque no menu <strong>⋮</strong> (três pontos) no canto superior direito</li>
              <li>Selecione <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar aplicativo"</strong></li>
              <li>Confirme tocando em <strong>"Instalar"</strong></li>
              <li>O ícone do Invex aparecerá na sua tela inicial</li>
            </ol>
          </CardContent>
        </Card>

        {/* iOS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Apple className="w-5 h-5 text-muted-foreground" />
              iPhone / iPad (Safari)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Abra o Invex no <strong>Safari</strong> (obrigatório no iOS)</li>
              <li>Toque no ícone de <strong>compartilhamento</strong> (quadrado com seta para cima)</li>
              <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
              <li>Confirme tocando em <strong>"Adicionar"</strong></li>
              <li>O ícone do Invex aparecerá na sua tela inicial</li>
            </ol>
          </CardContent>
        </Card>

        {/* Desktop */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Monitor className="w-5 h-5 text-accent-foreground" />
              Desktop (Chrome / Edge)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Abra o Invex no <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong></li>
              <li>Clique no ícone de <strong>instalação</strong> (⊕) na barra de endereço, ou vá em Menu → <strong>"Instalar Invex"</strong></li>
              <li>Confirme clicando em <strong>"Instalar"</strong></li>
              <li>O Invex abrirá como aplicativo independente</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default InstalarApp;
