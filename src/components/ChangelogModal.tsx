import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Wrench, Calendar, Rocket } from 'lucide-react';

interface SystemUpdate {
  id: string;
  versao: string;
  titulo: string;
  data_atualizacao: string;
  descricao: string;
  novas_funcionalidades: string[];
  correcoes: string[];
}

const fmtDate = (d: string) => {
  try {
    const [y, m, dd] = d.split('-');
    return `${dd}/${m}/${y}`;
  } catch { return d; }
};

export const ChangelogModal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [update, setUpdate] = useState<SystemUpdate | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) { setUpdate(null); setOpen(false); return; }
    let cancel = false;
    (async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: seen } = await supabase
          .from('user_update_views')
          .select('update_id')
          .eq('user_id', authUser.id);
        const seenIds = (seen || []).map((s: any) => s.update_id);

        let q = supabase
          .from('system_updates')
          .select('*')
          .eq('status', 'publicada')
          .order('data_atualizacao', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1);
        if (seenIds.length > 0) q = q.not('id', 'in', `(${seenIds.join(',')})`);
        const { data } = await q;
        const next = (data && data[0]) as any;
        if (cancel || !next) return;
        setUpdate({
          ...next,
          novas_funcionalidades: Array.isArray(next.novas_funcionalidades) ? next.novas_funcionalidades : [],
          correcoes: Array.isArray(next.correcoes) ? next.correcoes : [],
        });
        setOpen(true);
      } catch (e) {
        console.error('changelog check failed', e);
      }
    })();
    return () => { cancel = true; };
  }, [user]);

  const marcarComoLida = async () => {
    if (!update || !user) return;
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      await supabase
        .from('user_update_views')
        .insert({ user_id: authUser.id, update_id: update.id });
    } catch (e) {
      console.error('marcar lida falhou', e);
    } finally {
      setOpen(false);
      setUpdate(null);
    }
  };

  if (!update) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) marcarComoLida(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 px-5 py-5 border-b">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Rocket className="w-5 h-5" />
              <span className="text-xs font-semibold tracking-wider uppercase">Versão {update.versao}</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl">{update.titulo || 'Novidades da Atualização'}</DialogTitle>
            {update.descricao && (
              <p className="text-sm text-muted-foreground pt-1">{update.descricao}</p>
            )}
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[55vh] px-5 py-4">
          <div className="space-y-5">
            {update.novas_funcionalidades.length > 0 && (
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Novas Funcionalidades
                </h3>
                <ul className="space-y-1.5">
                  {update.novas_funcionalidades.map((f, i) => (
                    <li key={i} className="text-sm text-foreground/90 flex gap-2">
                      <span className="text-primary mt-0.5">•</span><span>{f}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {update.correcoes.length > 0 && (
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <Wrench className="w-4 h-4 text-amber-500" /> Correções
                </h3>
                <ul className="space-y-1.5">
                  {update.correcoes.map((c, i) => (
                    <li key={i} className="text-sm text-foreground/90 flex gap-2">
                      <span className="text-amber-500 mt-0.5">•</span><span>{c}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Calendar className="w-3.5 h-3.5" />
              Data da atualização: {fmtDate(update.data_atualizacao)}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-5 py-4 border-t bg-muted/30 flex-row gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => { await marcarComoLida(); navigate('/changelog'); }}
          >
            Ver histórico
          </Button>
          <Button onClick={marcarComoLida}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangelogModal;
