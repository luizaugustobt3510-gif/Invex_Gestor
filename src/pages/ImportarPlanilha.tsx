import { useState, useRef } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { readExcelFile, writeExcelFromAoa } from '@/lib/excelUtils';

interface ImportRow {
  rowNum: number;
  codigo: string;
  material: string;
  unidade: string;
  quantidade: number;
  minimo: number;
  maximo: number;
  preco: number;
  localizacao: string;
  error?: string;
}

interface ImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

const ImportarPlanilha = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [mode, setMode] = useState<'create_update' | 'create_only' | 'update_only'>('create_update');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState('');

  const downloadTemplate = () => {
    writeExcelFromAoa('modelo_importacao_invex.xlsx', 'Modelo', [
      ['codigo', 'material', 'unidade', 'quantidade', 'minimo', 'maximo', 'preco', 'localizacao'],
      ['001', 'Parafuso M8', 'UNIDADE', 100, 10, 500, 0.50, 'Prateleira A1'],
      ['002', 'Óleo Lubrificante', 'LITRO', 20, 5, 50, 25.00, 'Prateleira B2'],
    ]);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const json = await readExcelFile(buffer);

        const parsed: ImportRow[] = json.map((row, i) => {
          const r: ImportRow = {
            rowNum: i + 2,
            codigo: String(row.codigo || row.id_externo || '').trim(),
            material: String(row.material || row.nome || '').trim(),
            unidade: String(row.unidade || '').trim().toUpperCase(),
            quantidade: Number(row.quantidade || row.estoque || 0),
            minimo: Number(row.minimo || row.estoque_minimo || 0),
            maximo: Number(row.maximo || 0),
            preco: Number(row.preco || 0),
            localizacao: String(row.localizacao || row.observacoes || '').trim(),
          };

          // Validate
          const errors: string[] = [];
          if (!r.codigo) errors.push('código obrigatório');
          if (!r.material) errors.push('material/nome obrigatório');
          if (!r.unidade) errors.push('unidade obrigatória');
          if (isNaN(r.quantidade)) errors.push('quantidade inválida');
          if (isNaN(r.minimo)) errors.push('mínimo inválido');

          if (errors.length > 0) r.error = errors.join('; ');
          return r;
        });

        setRows(parsed);
      } catch {
        toast({ title: 'Erro', description: 'Erro ao ler o arquivo. Verifique o formato.', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    setResult(null);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Não autenticado');

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', authUser.id)
        .limit(1)
        .single();

      const companyId = roleData?.company_id;
      if (!companyId) throw new Error('Empresa não encontrada');

      // Get existing materials for this company
      const { data: existingMaterials } = await supabase
        .from('materials')
        .select('id, codigo')
        .eq('company_id', companyId);

      const existingMap = new Map((existingMaterials || []).map(m => [m.codigo, m.id]));

      let created = 0;
      let updated = 0;
      const errors: { row: number; message: string }[] = [];

      for (const row of rows) {
        if (row.error) {
          errors.push({ row: row.rowNum, message: row.error });
          continue;
        }

        try {
          const existingId = existingMap.get(row.codigo);

          if (existingId) {
            if (mode === 'create_only') {
              errors.push({ row: row.rowNum, message: `Código ${row.codigo} já existe (modo somente criar)` });
              continue;
            }
            // Fetch current values to compare and only update changed fields
            const { data: current } = await supabase
              .from('materials')
              .select('material, unidade, quantidade, minimo, maximo, preco, localizacao')
              .eq('id', existingId)
              .single();

            const desired: Record<string, any> = {
              material: row.material,
              unidade: row.unidade,
              quantidade: row.quantidade,
              minimo: row.minimo,
              maximo: row.maximo,
              preco: row.preco,
              localizacao: row.localizacao,
            };

            const changes: Record<string, any> = {};
            if (current) {
              for (const key of Object.keys(desired)) {
                const currentVal = (current as any)[key];
                const desiredVal = desired[key];
                const isNumeric = ['quantidade', 'minimo', 'maximo', 'preco'].includes(key);
                const equal = isNumeric
                  ? Number(currentVal ?? 0) === Number(desiredVal ?? 0)
                  : String(currentVal ?? '') === String(desiredVal ?? '');
                if (!equal) changes[key] = desiredVal;
              }
            } else {
              Object.assign(changes, desired);
            }

            if (Object.keys(changes).length === 0) {
              // Nothing changed; skip without counting as updated
              continue;
            }

            const { error } = await supabase.from('materials').update(changes).eq('id', existingId);
            if (error) throw error;
            updated++;
          } else {
            if (mode === 'update_only') {
              errors.push({ row: row.rowNum, message: `Código ${row.codigo} não existe (modo somente atualizar)` });
              continue;
            }
            // Insert
            const { error } = await supabase.from('materials').insert({
              company_id: companyId,
              codigo: row.codigo,
              material: row.material,
              unidade: row.unidade,
              quantidade: row.quantidade,
              minimo: row.minimo,
              maximo: row.maximo,
              preco: row.preco,
              localizacao: row.localizacao,
            });
            if (error) throw error;
            created++;
          }
        } catch (err: any) {
          errors.push({ row: row.rowNum, message: err?.message || 'Erro desconhecido' });
        }
      }

      setResult({ created, updated, errors });
      toast({ title: 'Importação concluída!', description: `${created} criados, ${updated} atualizados, ${errors.length} erros.` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Erro ao importar.', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const validRows = rows.filter(r => !r.error);
  const errorRows = rows.filter(r => r.error);

  return (
    <MainLayout>
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Produtos por Planilha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Arquivo (.xlsx ou .csv)</Label>
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" onChange={handleFile} className="hidden" />
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  {fileName || 'Selecionar arquivo'}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Modo de importação</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as any)}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create_update">Criar e atualizar existentes</SelectItem>
                  <SelectItem value="create_only">Somente criar novos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Baixar Modelo
            </Button>
          </div>

          {/* Preview */}
          {rows.length > 0 && !result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-primary" /> {validRows.length} válidos</span>
                  {errorRows.length > 0 && <span className="flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-destructive" /> {errorRows.length} com erro</span>}
                </div>
                <Button onClick={handleImport} disabled={importing || validRows.length === 0}>
                  {importing ? 'Importando...' : `Importar ${validRows.length} produto(s)`}
                </Button>
              </div>

              <div className="border rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Linha</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Mín</TableHead>
                      <TableHead>Máx</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.rowNum} className={row.error ? 'bg-destructive/5' : ''}>
                        <TableCell>{row.rowNum}</TableCell>
                        <TableCell className="font-mono">{row.codigo || '-'}</TableCell>
                        <TableCell>{row.material || '-'}</TableCell>
                        <TableCell>{row.unidade || '-'}</TableCell>
                        <TableCell>{row.quantidade}</TableCell>
                        <TableCell>{row.minimo}</TableCell>
                        <TableCell>{row.maximo}</TableCell>
                        <TableCell>R$ {row.preco.toFixed(2)}</TableCell>
                        <TableCell>
                          {row.error ? (
                            <span className="text-xs text-destructive flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> {row.error}
                            </span>
                          ) : (
                            <Badge variant="secondary">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold text-lg">Resultado da Importação</h3>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{result.created}</p>
                  <p className="text-sm text-muted-foreground">Criados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-500">{result.updated}</p>
                  <p className="text-sm text-muted-foreground">Atualizados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-destructive">{result.errors.length}</p>
                  <p className="text-sm text-muted-foreground">Erros</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Linha</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell>{e.row}</TableCell>
                          <TableCell className="text-destructive">{e.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <Button variant="outline" onClick={() => { setRows([]); setResult(null); setFileName(''); if (fileRef.current) fileRef.current.value = ''; }}>
                Nova Importação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default ImportarPlanilha;
