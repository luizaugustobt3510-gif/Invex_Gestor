import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';
import { readExcelFile, writeExcelFromAoa } from '@/lib/excelUtils';

interface ImportRow {
  nome: string;
  cpf: string;
  cargo: string;
  departamento: string;
  data_admissao: string;
  data_nascimento: string;
  salario: number;
  status: string;
  error?: string;
  valid: boolean;
}

const ImportarFuncionarios = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  const handleDownloadTemplate = () => {
    writeExcelFromAoa('Modelo_Importacao_Funcionarios.xlsx', 'Modelo', [
      ['Nome', 'CPF', 'Cargo', 'Setor', 'Data Admissão', 'Data Nascimento', 'Salário', 'Status'],
      ['João Silva', '123.456.789-00', 'Auxiliar', 'Logística', '2024-01-15', '1990-05-20', 2500, 'ativo'],
      ['Maria Santos', '987.654.321-00', 'Analista', 'Administrativo', '2023-06-01', '1985-11-10', 3500, 'ativo'],
    ]);
  };

  const validateRow = (row: any, index: number): ImportRow => {
    const errors: string[] = [];
    const nome = String(row['Nome'] || row['nome'] || '').trim();
    const cpf = String(row['CPF'] || row['cpf'] || '').trim();
    const cargo = String(row['Cargo'] || row['cargo'] || '').trim();
    const departamento = String(row['Setor'] || row['departamento'] || row['Departamento'] || '').trim();
    const dataAdm = String(row['Data Admissão'] || row['data_admissao'] || row['Data Admissao'] || '').trim();
    const dataNasc = String(row['Data Nascimento'] || row['data_nascimento'] || '').trim();
    const salario = parseFloat(row['Salário'] || row['salario'] || row['Salario'] || '0') || 0;
    const status = String(row['Status'] || row['status'] || 'ativo').trim().toLowerCase();

    if (!nome) errors.push('Nome obrigatório');
    if (!cpf) errors.push('CPF obrigatório');
    if (!cargo) errors.push('Cargo obrigatório');
    if (!dataAdm) errors.push('Data admissão obrigatória');
    if (salario < 0) errors.push('Salário inválido');

    // Validate date format
    const parseDate = (d: string) => {
      if (!d) return '';
      // Handle dd/mm/yyyy
      const brMatch = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
      // Handle yyyy-mm-dd
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      // Handle Excel serial dates
      const num = Number(d);
      if (!isNaN(num) && num > 30000) {
        const date = new Date((num - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
      }
      return d;
    };

    const parsedAdm = parseDate(dataAdm);
    const parsedNasc = parseDate(dataNasc);

    if (parsedAdm && isNaN(new Date(parsedAdm).getTime())) errors.push('Data admissão inválida');

    return {
      nome,
      cpf,
      cargo,
      departamento,
      data_admissao: parsedAdm,
      data_nascimento: parsedNasc || '',
      salario,
      status: ['ativo', 'inativo', 'afastado', 'ferias'].includes(status) ? status : 'ativo',
      error: errors.length > 0 ? errors.join('; ') : undefined,
      valid: errors.length === 0,
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImported(false);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      const jsonData = await readExcelFile(buffer);
      const validated = jsonData.map((row, i) => validateRow(row, i));
      setRows(validated);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    const validRows = rows.filter(r => r.valid);
    if (validRows.length === 0) {
      toast({ title: 'Nenhum registro válido', variant: 'destructive' });
      return;
    }

    setImporting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setImporting(false); return; }
    const { data: roleData } = await supabase.from('user_roles').select('company_id').eq('user_id', user.id).not('company_id', 'is', null).limit(1).single();
    const companyId = roleData?.company_id;
    if (!companyId) {
      toast({ title: 'Empresa não encontrada', variant: 'destructive' });
      setImporting(false);
      return;
    }

    const insertData = validRows.map(r => ({
      company_id: companyId,
      nome: r.nome,
      cpf: r.cpf,
      cargo: r.cargo,
      departamento: r.departamento,
      data_admissao: r.data_admissao,
      data_nascimento: r.data_nascimento || null,
      salario: r.salario,
      status: r.status,
    }));

    const { error } = await supabase.from('employees').insert(insertData);

    if (error) {
      toast({ title: 'Erro na importação', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `${validRows.length} colaborador(es) importado(s) com sucesso!` });
      setImported(true);

      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'importacao_funcionarios',
        entity_type: 'employee',
        details: { quantidade: validRows.length },
      });
    }

    setImporting(false);
  };

  const validCount = rows.filter(r => r.valid).length;
  const errorCount = rows.filter(r => !r.valid).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="w-6 h-6" /> Importar Funcionários</h1>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">1. Baixar Modelo</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Baixe a planilha modelo e preencha com os dados dos colaboradores.</p>
              <Button onClick={handleDownloadTemplate} variant="outline" className="gap-2"><Download className="w-4 h-4" /> Baixar Planilha Modelo</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">2. Enviar Planilha</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Selecione o arquivo Excel preenchido para validação.</p>
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
            </CardContent>
          </Card>
        </div>

        {rows.length > 0 && (
          <>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 gap-1">
                <CheckCircle className="w-3 h-3" /> {validCount} válidos
              </Badge>
              {errorCount > 0 && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                  <XCircle className="w-3 h-3" /> {errorCount} com erro
                </Badge>
              )}
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead>Admissão</TableHead>
                        <TableHead>Salário</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={i} className={r.valid ? '' : 'bg-destructive/5'}>
                          <TableCell>
                            {r.valid ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-destructive" />}
                          </TableCell>
                          <TableCell className="font-medium">{r.nome || '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{r.cpf || '—'}</TableCell>
                          <TableCell>{r.cargo || '—'}</TableCell>
                          <TableCell>{r.departamento || '—'}</TableCell>
                          <TableCell>{r.data_admissao || '—'}</TableCell>
                          <TableCell>{r.salario > 0 ? r.salario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</TableCell>
                          <TableCell>
                            {r.error ? (
                              <span className="text-xs text-destructive">{r.error}</span>
                            ) : (
                              <Badge variant="outline">{r.status}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {!imported && (
              <Button onClick={handleImport} disabled={importing || validCount === 0} className="gap-2">
                <Upload className="w-4 h-4" />
                {importing ? 'Importando...' : `Importar ${validCount} Colaborador(es)`}
              </Button>
            )}

            {imported && (
              <Card className="border-emerald-500/50 bg-emerald-500/5">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-emerald-700">Importação concluída com sucesso!</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default ImportarFuncionarios;
