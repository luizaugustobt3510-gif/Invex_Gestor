import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { InvexLogo } from '@/components/InvexLogo';
import { ShieldCheck, ShieldX, Loader2 } from 'lucide-react';

interface Resultado {
  codigo: string;
  tipo: string;
  emitida_em: string;
  profissional: string | null;
  tecnico: string | null;
  paciente: string | null;
  hash: string | null;
  situacao: string;
}

export default function ValidarReceita() {
  const params = useParams<{ codigo?: string }>();
  const [search] = useSearchParams();
  const [codigo, setCodigo] = useState(params.codigo || search.get('c') || '');
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState<Resultado | null>(null);

  const consultar = async (c: string) => {
    if (!c.trim()) return;
    setLoading(true);
    const { data } = await (supabase.rpc as any)('validate_prescription', { _codigo: c.trim().toUpperCase() });
    setResult((data as Resultado) || null);
    setChecked(true);
    setLoading(false);
  };

  useEffect(() => {
    if (params.codigo) consultar(params.codigo);
    // eslint-disable-next-line
  }, [params.codigo]);

  return (
    <main className="min-h-dvh bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="flex justify-center"><InvexLogo size="md" /></div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validação de receita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                placeholder="Código da receita"
                onKeyDown={e => e.key === 'Enter' && consultar(codigo)}
              />
              <Button onClick={() => consultar(codigo)} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Consultar'}
              </Button>
            </div>

            {checked && !result && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <ShieldX className="w-5 h-5 text-destructive" />
                Nenhuma receita encontrada para este código.
              </div>
            )}

            {result && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Documento autêntico, emitido pelo Invex Gestor.
                  <Badge className="ml-auto">{result.situacao === 'valida' ? 'Válida' : result.situacao}</Badge>
                </div>
                <dl className="text-sm space-y-1.5">
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Código</dt><dd className="font-mono">{result.codigo}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Emitida em</dt><dd>{new Date(result.emitida_em).toLocaleString('pt-BR')}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Profissional</dt><dd>{result.profissional || '-'}</dd></div>
                  {result.tecnico && (
                    <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Técnico responsável</dt><dd>{result.tecnico}</dd></div>
                  )}
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Paciente</dt><dd>{result.paciente || '-'}</dd></div>
                  {result.hash && (
                    <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Resumo do documento</dt><dd className="font-mono text-xs break-all text-right">{result.hash}</dd></div>
                  )}
                </dl>
                <p className="text-xs text-muted-foreground">
                  Esta consulta confirma apenas a existência e a autoria do documento. Dados clínicos não são divulgados.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">Tecnologia Invex Gestor 2026</p>
      </div>
    </main>
  );
}
