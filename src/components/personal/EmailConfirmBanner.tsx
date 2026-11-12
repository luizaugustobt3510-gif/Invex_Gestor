import { useEffect, useState } from 'react';
import { MailWarning, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { authErrorMessage } from '@/lib/authErrors';
import { daysLeft, emailConfirmState, type EmailConfirmState } from '@/lib/emailConfirmPolicy';

/** Aviso piscando para confirmar o e-mail; depois de 7 dias sem confirmar, bloqueia a tela. */
export function EmailConfirmBanner({ onLogout, className }: { onLogout?: () => void; className?: string }) {
  const [state, setState] = useState<EmailConfirmState>('ok');
  const [createdAt, setCreatedAt] = useState<string>('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.email) return;
      const { data, error } = await supabase.rpc('personal_email_status');
      if (!alive || error || !data) return;
      const s = data as { verified: boolean; created_at: string };
      setEmail(u.user.email); setCreatedAt(s.created_at);
      setState(emailConfirmState(s.verified, s.created_at));
    })();
    return () => { alive = false; };
  }, []);

  if (state === 'ok') return null;

  const send = async () => {
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    setSending(false);
    if (error) { toast.error(authErrorMessage(error, 'Não foi possível enviar o e-mail.')); return; }
    setSent(true); toast.success('Link enviado! Abra seu e-mail e toque no link para confirmar.');
  };
  const sair = async () => { if (onLogout) onLogout(); else { await supabase.auth.signOut(); window.location.reload(); } };

  if (state === 'bloqueado') {
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-background/95 p-5 backdrop-blur" role="dialog" aria-modal="true">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
          <MailWarning className="mx-auto h-10 w-10 text-destructive" />
          <h2 className="text-lg font-semibold">Confirme seu e-mail para continuar</h2>
          <p className="text-sm text-muted-foreground">
            Sua conta foi criada há mais de 1 semana e o e-mail <b className="break-all text-foreground">{email}</b> ainda não foi confirmado.
            Enviamos um link: é só tocar nele para liberar a conta de novo.
          </p>
          <Button className="h-12 w-full text-base" onClick={send} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : sent ? 'Enviar de novo' : 'Enviar link de confirmação'}
          </Button>
          {sent && <p className="text-xs text-muted-foreground">Não chegou? Veja a caixa de spam.</p>}
          <Button variant="ghost" className="w-full" onClick={sair}><LogOut className="mr-2 h-4 w-4" />Sair</Button>
        </div>
      </div>
    );
  }

  const dias = daysLeft(createdAt);
  return (
    <div className={cn("email-confirm-blink flex flex-wrap items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm", className)} role="status">
      <MailWarning className="h-4 w-4 shrink-0 text-destructive" />
      <span className="min-w-0 flex-1">
        <b>Confirme seu e-mail.</b> {dias > 0 ? `Faltam ${dias} ${dias === 1 ? 'dia' : 'dias'} para a conta ser bloqueada.` : 'Confirme hoje para não perder o acesso.'}
      </span>
      <Button size="sm" variant="destructive" className="h-9 rounded-full" onClick={send} disabled={sending}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : sent ? 'Enviar de novo' : 'Confirmar agora'}
      </Button>
    </div>
  );
}
