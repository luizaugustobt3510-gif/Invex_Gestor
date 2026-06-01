import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Wrench, Calendar, Rocket } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SU {
  id: string;
  versao: string;
  titulo: string;
  data_atualizacao: string;
  descricao: string;
  novas_funcionalidades: string[];
  correcoes: string[];
}

const fmt = (d: string) => { try { const [y,m,dd]=d.split('-'); return `${dd}/${m}/${y}`; } catch { return d; } };

const Changelog = () => {
  const [items, setItems] = useState<SU[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('system_updates')
        .select('*')
        .eq('status', 'publicada')
        .order('data_atualizacao', { ascending: false })
        .order('created_at', { ascending: false });
      setItems((data || []).map((u: any) => ({
        ...u,
        novas_funcionalidades: Array.isArray(u.novas_funcionalidades) ? u.novas_funcionalidades : [],
        correcoes: Array.isArray(u.correcoes) ? u.correcoes : [],
      })));
      setLoading(false);
    })();
  }, []);

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Histórico de Atualizações</h1>
            <p className="text-sm text-muted-foreground">Acompanhe novidades e correções do sistema</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : items.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma atualização publicada ainda.</CardContent></Card>
        ) : items.map(u => (
          <Card key={u.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <Badge variant="secondary" className="mb-1.5">v{u.versao}</Badge>
                  <CardTitle className="text-lg">{u.titulo}</CardTitle>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />{fmt(u.data_atualizacao)}
                </div>
              </div>
              {u.descricao && <p className="text-sm text-muted-foreground pt-1">{u.descricao}</p>}
            </CardHeader>
            <CardContent className="space-y-4">
              {u.novas_funcionalidades.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-primary" />Novas Funcionalidades</h4>
                  <ul className="space-y-1 text-sm">
                    {u.novas_funcionalidades.map((f,i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{f}</li>)}
                  </ul>
                </div>
              )}
              {u.correcoes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2"><Wrench className="w-4 h-4 text-amber-500" />Correções</h4>
                  <ul className="space-y-1 text-sm">
                    {u.correcoes.map((c,i) => <li key={i} className="flex gap-2"><span className="text-amber-500">•</span>{c}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </MainLayout>
  );
};

export default Changelog;
