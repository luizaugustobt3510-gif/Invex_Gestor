import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dumbbell } from 'lucide-react';
import { toast } from 'sonner';

interface Grant { user_id: string; email: string | null; ativo: boolean; fim: string | null }

/** Super Admin libera/remove o Premium do Invex Fitness manualmente. */
export const FitnessPremiumAdmin = () => {
  const [email, setEmail] = useState('');
  const [fim, setFim] = useState('');
  const [list, setList] = useState<Grant[]>([]);

  const load = async () => {
    const { data } = await supabase.from('fitness_premium_grants').select('user_id, email, ativo, fim').order('created_at', { ascending: false });
    setList((data as Grant[]) || []);
  };
  useEffect(() => { load(); }, []);

  const save = async (mail: string, ativo: boolean, ate: string | null) => {
    const { error } = await supabase.rpc('fitness_admin_grant', { _email: mail, _ativo: ativo, _fim: ate as any });
    if (error) return toast.error(error.message.includes('não encontrado') ? 'Usuário não encontrado.' : 'Não foi possível salvar.');
    toast.success(ativo ? 'Premium Fitness liberado.' : 'Premium Fitness removido.');
    setEmail(''); setFim(''); load();
  };

  return (
    <Card className="max-w-5xl mx-auto mt-6">
      <CardHeader><CardTitle className="flex items-center gap-2"><Dumbbell className="w-5 h-5" />Invex Fitness | Premium manual</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input placeholder="E-mail do usuário" value={email} onChange={e => setEmail(e.target.value)} />
          <Input type="date" value={fim} onChange={e => setFim(e.target.value)} className="sm:w-44" title="Válido até (vazio = sem prazo)" />
          <Button disabled={!email.trim()} onClick={() => save(email, true, fim || null)}>Liberar Premium</Button>
        </div>
        {list.map(g => (
          <div key={g.user_id} className="flex items-center justify-between gap-2 border rounded-md p-2 text-sm">
            <span className="truncate">{g.email}</span>
            <div className="flex items-center gap-2">
              <Badge variant={g.ativo ? 'default' : 'secondary'}>{g.ativo ? (g.fim ? `até ${new Date(g.fim + 'T12:00').toLocaleDateString('pt-BR')}` : 'Ativo') : 'Inativo'}</Badge>
              {g.email && <Button size="sm" variant="outline" onClick={() => save(g.email!, !g.ativo, g.fim)}>{g.ativo ? 'Remover' : 'Reativar'}</Button>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
