import { useMemo, useRef, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { readExcelFile, writeExcelFromAoa } from '@/lib/excelUtils';
import { Download, Upload, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';

type ParsedRow = {
  linha: number;
  data: string;
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  categoria: string;
  vencimento: string | null;
  status: string;
  forma_pagamento: string | null;
  observacoes: string | null;
  erro?: string;
};

const HEADERS = [
  'Data (AAAA-MM-DD)',
  'Tipo (receita/despesa)',
  'Descrição',
  'Valor',
  'Categoria',
  'Vencimento (AAAA-MM-DD)',
  'Status (pago/pendente)',
  'Forma de pagamento',
  'Observações',
];

const pick = (row: Record<string, any>, ...names: string[]) => {
  const keys = Object.keys(row);
  for (const n of names) {
    const k = keys.find(key => key.toLowerCase().startsWith(n.toLowerCase()));
    if (k !== undefined) return row[k];
  }
  return undefined;
};

const cellText = (v: any): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (v instanceof Date) return format(v, 'yyyy-MM-dd');
    if ('text' in v) return String((v as any).text);
    if ('result' in v) return String((v as any).result);
  }
  return String(v).trim();
};

const toDate = (v: any): string => {
  if (v instanceof Date) return format(v, 'yyyy-MM-dd');
  const s = cellText(v);
  if (!s) return '';
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return '';
};

const toNumber = (v: any): number => {
  if (typeof v === 'number') return v;
  const s = cellText(v).replace(/[R$\s.]/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

const ImportarFinanceiro = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mes, setMes] = useState(format(new Date(), 'yyyy-MM'));
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);

  const valid = useMemo(() => rows.filter(r => !r.erro), [rows]);
  const invalid = useMemo(() => rows.filter(r => r.erro), [rows]);
  const totals = useMemo(() => ({
    receitas: valid.filter(r => r.tipo === 'receita').reduce((s, r) => s + r.valor, 0),
    despesas: valid.filter(r => r.tipo === 'despesa').reduce((s, r) => s + r.valor, 0),
  }), [valid]);

  const baixarModelo = async () => {
    const exemplo = [
      [`${mes}-05`, 'receita', 'Recebimento de cliente X', 1500.5, 'Vendas', `${mes}-05`, 'pago', 'PIX', ''],
      [`${mes}-10`, 'despesa', 'Aluguel da unidade', 3200, 'Aluguel', `${mes}-10`, 'pendente', 'Boleto', 'Contrato 2026'],
    ];
    await writeExcelFromAoa(`modelo-importacao-financeira-${mes}.xlsx`, 'Lançamentos', [HEADERS, ...exemplo]);
  };

  const onFile = async (file: File) => {
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const raw = await readExcelFile(buf);
      const parsed: ParsedRow[] = raw.map((r, i) => {
        const data = toDate(pick(r, 'Data'));
        const tipoRaw = cellText(pick(r, 'Tipo')).toLowerCase();
        const descricao = cellText(pick(r, 'Descri'));
        const valor = toNumber(pick(r, 'Valor'));
        const statusRaw = cellText(pick(r, 'Status')).toLowerCase();
        const row: ParsedRow = {
          linha: i + 2,
          data,
          tipo: tipoRaw.startsWith('rec') ? 'receita' : 'despesa',
          descricao,
          valor,
          categoria: cellText(pick(r, 'Categoria')),
          vencimento: toDate(pick(r, 'Vencimento')) || null,
          status: statusRaw.startsWith('pag') ? 'pago' : 'pendente',
          forma_pagamento: cellText(pick(r, 'Forma')) || null,
          observacoes: cellText(pick(r, 'Observa')) || null,
        };
        if (!descricao) row.erro = 'Descrição em branco';
        else if (!Number.isFinite(valor) || valor <= 0) row.erro = 'Valor inválido';
        else if (!data) row.erro = 'Data inválida';
        else if (!data.startsWith(mes)) row.erro = `Data fora do mês ${mes}`;
        else if (!tipoRaw.startsWith('rec') && !tipoRaw.startsWith('desp')) row.erro = 'Tipo deve ser receita ou despesa';
        return row;
      });
      setRows(parsed);
      if (!parsed.length) toast({ title: 'Planilha vazia', description: 'Nenhuma linha encontrada.', variant: 'destructive' });
    } catch {
      setRows([]);
      toast({ title: 'Não foi possível ler o arquivo', description: 'Envie um arquivo Excel (.xlsx) no formato do modelo.', variant: 'destructive' });
    }
  };

  const importar = async () => {
    if (!user?.companyId || !valid.length) return;
    setSaving(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const uid = authUser.user?.id;
      if (!uid) throw new Error('sessão');

      const { data: cats } = await supabase
        .from('financial_categories')
        .select('id, nome')
        .eq('company_id', user.companyId);
      const catMap = new Map((cats || []).map(c => [c.nome.trim().toLowerCase(), c.id]));

      const novas = Array.from(new Set(
        valid.map(r => r.categoria.trim()).filter(n => n && !catMap.has(n.toLowerCase())),
      ));
      if (novas.length) {
        const { data: inserted } = await supabase
          .from('financial_categories')
          .insert(novas.map(nome => ({ company_id: user.companyId!, nome, tipo: 'ambos' })))
          .select('id, nome');
        (inserted || []).forEach(c => catMap.set(c.nome.trim().toLowerCase(), c.id));
      }

      const payload = valid.map(r => ({
        company_id: user.companyId!,
        user_id: uid,
        tipo: r.tipo,
        descricao: r.descricao,
        valor: r.valor,
        data: r.data,
        data_vencimento: r.vencimento,
        data_pagamento: r.status === 'pago' ? r.data : null,
        status: r.status,
        categoria_id: catMap.get(r.categoria.trim().toLowerCase()) || null,
        forma_pagamento: r.forma_pagamento,
        observacoes: r.observacoes,
        origem: 'importacao',
      }));

      const { error } = await supabase.from('financial_entries').insert(payload);
      if (error) throw error;

      toast({ title: 'Importação concluída', description: `${payload.length} lançamento(s) adicionados em ${mes}.` });
      setRows([]);
      setFileName('');
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      toast({ title: 'Falha ao importar', description: 'Nenhum lançamento foi gravado. Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Importar Lançamentos</h1>
          <p className="text-muted-foreground">Envie entradas e saídas de um mês por planilha.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">1. Mês e modelo</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="mes">Mês de referência</Label>
              <Input id="mes" type="month" value={mes} onChange={e => { setMes(e.target.value); setRows([]); }} className="w-48" />
            </div>
            <Button variant="outline" onClick={baixarModelo}>
              <Download className="h-4 w-4 mr-2" /> Baixar modelo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">2. Enviar planilha</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Escolher arquivo
            </Button>
            {fileName && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" /> {fileName}
              </p>
            )}
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Conferir e confirmar</CardTitle>
              <div className="flex flex-wrap gap-3 pt-2 text-sm">
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {valid.length} prontos
                </Badge>
                {invalid.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> {invalid.length} com problema
                  </Badge>
                )}
                <span className="text-muted-foreground">Entradas: {moeda(totals.receitas)}</span>
                <span className="text-muted-foreground">Saídas: {moeda(totals.despesas)}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[420px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Linha</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(r => (
                      <TableRow key={r.linha} className={r.erro ? 'bg-destructive/5' : undefined}>
                        <TableCell>{r.linha}</TableCell>
                        <TableCell>{r.data || '—'}</TableCell>
                        <TableCell>{r.tipo === 'receita' ? 'Entrada' : 'Saída'}</TableCell>
                        <TableCell className="max-w-[240px] truncate">{r.descricao || '—'}</TableCell>
                        <TableCell className="text-right">{Number.isFinite(r.valor) ? moeda(r.valor) : '—'}</TableCell>
                        <TableCell>{r.categoria || '—'}</TableCell>
                        <TableCell>
                          {r.erro
                            ? <span className="text-destructive text-xs">{r.erro}</span>
                            : <Badge variant="outline">{r.status}</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={importar} disabled={saving || !valid.length}>
                {saving ? 'Importando…' : `Importar ${valid.length} lançamento(s)`}
              </Button>
              {invalid.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  As linhas com problema são ignoradas. Corrija a planilha e envie novamente se precisar delas.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default ImportarFinanceiro;
