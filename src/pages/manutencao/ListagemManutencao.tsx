import { useEffect, useState, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { List, Search, Upload, Trash2, FileText, Plus, ArrowUpDown } from 'lucide-react';

interface MaintenanceRecord {
  id: string;
  equipamento: string;
  controle: string;
  frequencia: string;
  empresa_prestadora: string;
  manutencao_corretiva: string | null;
  manutencao_preventiva: string;
  data_validade: string;
  observacoes: string;
  company_id: string;
}

interface Attachment {
  id: string;
  nome_arquivo: string;
  arquivo_url: string;
  tipo_documento: string;
  uploaded_by_nome: string;
  created_at: string;
}

const TIPO_DOC_OPTIONS = ['Ordem de serviço', 'Laudo', 'Nota fiscal', 'Certificado', 'Outro'];

const ListagemManutencao = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'todos');
  const [sortField, setSortField] = useState<'equipamento' | 'dias'>('dias');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);

  // Attachments dialog
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tipoDoc, setTipoDoc] = useState('Outro');

  const canEdit = user?.role === 'admin' || user?.role === 'logistica' || user?.role === 'manutencao' || user?.role === 'superadm';

  useEffect(() => {
    if (!user?.companyId) return;
    loadRecords();
  }, [user?.companyId]);

  const loadRecords = async () => {
    setLoading(true);
    const { data } = await supabase.from('maintenance_records').select('*').eq('company_id', user!.companyId!);
    setRecords(data || []);
    setLoading(false);
  };

  const calcDias = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

  const filtered = useMemo(() => {
    let list = records.filter(r => r.equipamento.toLowerCase().includes(search.toLowerCase()));
    const today = new Date().toISOString().split('T')[0];
    if (statusFilter === 'em_dia') list = list.filter(r => r.data_validade >= today);
    if (statusFilter === 'vencido') list = list.filter(r => r.data_validade < today);

    list.sort((a, b) => {
      if (sortField === 'equipamento') {
        return sortDir === 'asc' ? a.equipamento.localeCompare(b.equipamento) : b.equipamento.localeCompare(a.equipamento);
      }
      const dA = calcDias(a.data_validade);
      const dB = calcDias(b.data_validade);
      return sortDir === 'asc' ? dA - dB : dB - dA;
    });
    return list;
  }, [records, search, statusFilter, sortField, sortDir]);

  const toggleSort = (field: 'equipamento' | 'dias') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este registro?')) return;
    await supabase.from('maintenance_records').delete().eq('id', id);
    setRecords(prev => prev.filter(r => r.id !== id));
    toast({ title: 'Registro excluído' });
  };

  // Attachments
  const openAttachments = async (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    const { data } = await supabase.from('maintenance_attachments').select('*').eq('maintenance_record_id', record.id).order('created_at', { ascending: false });
    setAttachments(data || []);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !selectedRecord) return;
    const file = e.target.files[0];
    const ext = file.name.split('.').pop();
    const allowed = ['pdf', 'jpg', 'jpeg', 'png'];
    if (!allowed.includes(ext?.toLowerCase() || '')) {
      toast({ title: 'Formato não permitido', description: 'Apenas PDF, JPG e PNG', variant: 'destructive' });
      return;
    }

    setUploading(true);
    const filePath = `${user!.companyId}/${selectedRecord.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('manutencao-anexos').upload(filePath, file);
    if (upErr) {
      toast({ title: 'Erro no upload', description: upErr.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('manutencao-anexos').getPublicUrl(filePath);
    const { data: authData } = await supabase.auth.getUser();

    const { error: insertErr } = await supabase.from('maintenance_attachments').insert({
      company_id: user!.companyId!,
      maintenance_record_id: selectedRecord.id,
      nome_arquivo: file.name,
      arquivo_url: urlData.publicUrl,
      tipo_documento: tipoDoc,
      uploaded_by: authData?.user?.id || '',
      uploaded_by_nome: user!.nome,
    });

    setUploading(false);
    if (insertErr) {
      toast({ title: 'Erro ao salvar anexo', description: insertErr.message, variant: 'destructive' });
    } else {
      toast({ title: 'Anexo enviado!' });
      openAttachments(selectedRecord);
    }
    e.target.value = '';
  };

  const handleDeleteAttachment = async (att: Attachment) => {
    await supabase.from('maintenance_attachments').delete().eq('id', att.id);
    setAttachments(prev => prev.filter(a => a.id !== att.id));
    toast({ title: 'Anexo removido' });
  };

  const fmt = (d: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2"><List className="w-6 h-6" /> Listagem de Manutenção</h1>
          {canEdit && (
            <Button onClick={() => navigate('/manutencao/cadastro')} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Nova Manutenção
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar equipamento..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="em_dia">Em Dia</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Nº</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('equipamento')}>
                      Equipamento <ArrowUpDown className="w-3 h-3 inline ml-1" />
                    </TableHead>
                    <TableHead>Controle</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>M. Corretiva</TableHead>
                    <TableHead>M. Preventiva</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('dias')}>
                      Dias p/ Vencer <ArrowUpDown className="w-3 h-3 inline ml-1" />
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Obs</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
                  ) : (
                    filtered.map((r, i) => {
                      const dias = calcDias(r.data_validade);
                      const vencido = dias <= 0;
                      return (
                        <TableRow key={r.id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-medium">{r.equipamento}</TableCell>
                          <TableCell>{r.controle}</TableCell>
                          <TableCell>{r.frequencia}</TableCell>
                          <TableCell>{r.empresa_prestadora}</TableCell>
                          <TableCell>{fmt(r.manutencao_corretiva)}</TableCell>
                          <TableCell>{fmt(r.manutencao_preventiva)}</TableCell>
                          <TableCell>{fmt(r.data_validade)}</TableCell>
                          <TableCell className={vencido ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{dias}</TableCell>
                          <TableCell>
                            <Badge variant={vencido ? 'destructive' : 'default'} className={!vencido ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                              {vencido ? 'VENCIDO' : 'EM DIA'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate" title={r.observacoes || ''}>{r.observacoes || '—'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" title="Anexos" onClick={() => openAttachments(r)}>
                                <FileText className="w-4 h-4" />
                              </Button>
                              {canEdit && (
                                <Button variant="ghost" size="icon" title="Excluir" onClick={() => handleDelete(r.id)}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Attachments Dialog */}
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Documentos / Anexos — {selectedRecord?.equipamento}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {canEdit && (
                <div className="space-y-2 border rounded-lg p-3">
                  <Label>Tipo de documento</Label>
                  <Select value={tipoDoc} onValueChange={setTipoDoc}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPO_DOC_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} disabled={uploading} />
                    {uploading && <span className="text-sm text-muted-foreground">Enviando...</span>}
                  </div>
                </div>
              )}

              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum anexo encontrado.</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1 min-w-0">
                        <a href={att.arquivo_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline truncate block">{att.nome_arquivo}</a>
                        <p className="text-xs text-muted-foreground">{att.tipo_documento} • {att.uploaded_by_nome} • {new Date(att.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      {canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAttachment(att)}>
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default ListagemManutencao;
