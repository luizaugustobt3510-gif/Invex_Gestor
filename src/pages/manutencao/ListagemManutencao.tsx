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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { List, Search, Trash2, FileText, Plus, ArrowUpDown, RotateCcw, History, ChevronRight, Paperclip, MapPin } from 'lucide-react';

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
  setor?: string;
  sala?: string;
  andar?: string;
  parent_id?: string | null;
}

interface Attachment {
  id: string;
  nome_arquivo: string;
  arquivo_url: string;
  tipo_documento: string;
  uploaded_by_nome: string;
  created_at: string;
}

interface HistoryEntry {
  id: string;
  tipo: string;
  descricao: string;
  data_evento: string;
  usuario_nome: string;
  arquivo_url?: string | null;
  created_at: string;
}

const TIPO_DOC_OPTIONS = ['Ordem de serviço', 'Laudo', 'Nota fiscal', 'Certificado', 'Outro'];

const FREQ_DAYS: Record<string, number> = {
  'Mensal': 30, 'Bimestral': 60, 'Trimestral': 90, 'Semestral': 180, 'Anual': 365, 'Sob demanda': 365,
};

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

  // Detail dialog
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [detailTab, setDetailTab] = useState('info');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [subgroups, setSubgroups] = useState<MaintenanceRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tipoDoc, setTipoDoc] = useState('Outro');

  // Renewal dialog
  const [renewRecord, setRenewRecord] = useState<MaintenanceRecord | null>(null);
  const [renewDate, setRenewDate] = useState('');
  const [renewFile, setRenewFile] = useState<File | null>(null);
  const [renewObs, setRenewObs] = useState('');
  const [renewLoading, setRenewLoading] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'logistica' || user?.role === 'manutencao' || user?.role === 'superadm';

  useEffect(() => {
    if (!user?.companyId) return;
    loadRecords();
  }, [user?.companyId]);

  const loadRecords = async () => {
    setLoading(true);
    const { data } = await supabase.from('maintenance_records').select('*').eq('company_id', user!.companyId!);
    setRecords((data || []) as MaintenanceRecord[]);
    setLoading(false);
  };

  const calcDias = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

  // Only show parent records in main table
  const filtered = useMemo(() => {
    let list = records.filter(r => !r.parent_id && r.equipamento.toLowerCase().includes(search.toLowerCase()));
    const today = new Date().toISOString().split('T')[0];
    if (statusFilter === 'em_dia') list = list.filter(r => r.data_validade >= today);
    if (statusFilter === 'vencido') list = list.filter(r => r.data_validade < today);

    list.sort((a, b) => {
      if (sortField === 'equipamento') return sortDir === 'asc' ? a.equipamento.localeCompare(b.equipamento) : b.equipamento.localeCompare(a.equipamento);
      return sortDir === 'asc' ? calcDias(a.data_validade) - calcDias(b.data_validade) : calcDias(b.data_validade) - calcDias(a.data_validade);
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

  // Open detail
  const openDetail = async (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setDetailTab('info');
    const [attRes, histRes, subRes] = await Promise.all([
      supabase.from('maintenance_attachments').select('*').eq('maintenance_record_id', record.id).order('created_at', { ascending: false }),
      supabase.from('maintenance_history').select('*').eq('maintenance_record_id', record.id).order('created_at', { ascending: false }),
      supabase.from('maintenance_records').select('*').eq('parent_id', record.id).order('equipamento'),
    ]);
    setAttachments((attRes.data || []) as Attachment[]);
    setHistory((histRes.data || []) as HistoryEntry[]);
    setSubgroups((subRes.data || []) as MaintenanceRecord[]);
  };

  // Upload attachment
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
    if (upErr) { toast({ title: 'Erro no upload', description: upErr.message, variant: 'destructive' }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('manutencao-anexos').getPublicUrl(filePath);
    const { data: authData } = await supabase.auth.getUser();
    await supabase.from('maintenance_attachments').insert({
      company_id: user!.companyId!, maintenance_record_id: selectedRecord.id, nome_arquivo: file.name,
      arquivo_url: urlData.publicUrl, tipo_documento: tipoDoc, uploaded_by: authData?.user?.id || '', uploaded_by_nome: user!.nome,
    });
    setUploading(false);
    toast({ title: 'Anexo enviado!' });
    openDetail(selectedRecord);
    e.target.value = '';
  };

  const handleDeleteAttachment = async (att: Attachment) => {
    await supabase.from('maintenance_attachments').delete().eq('id', att.id);
    setAttachments(prev => prev.filter(a => a.id !== att.id));
    toast({ title: 'Anexo removido' });
  };

  // Quick renewal
  const openRenew = (record: MaintenanceRecord) => {
    setRenewRecord(record);
    const freqDays = FREQ_DAYS[record.frequencia] || 365;
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + freqDays);
    setRenewDate(newDate.toISOString().split('T')[0]);
    setRenewFile(null);
    setRenewObs('');
  };

  const handleRenew = async () => {
    if (!renewRecord || !renewDate || !user?.companyId) return;
    setRenewLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || '';
    const oldData = { data_validade: renewRecord.data_validade, manutencao_preventiva: renewRecord.manutencao_preventiva };
    const today = new Date().toISOString().split('T')[0];

    // Update record
    await supabase.from('maintenance_records').update({
      data_validade: renewDate,
      manutencao_preventiva: today,
    }).eq('id', renewRecord.id);

    // Upload proof file if provided
    let arquivoUrl: string | undefined;
    if (renewFile) {
      const ext = renewFile.name.split('.').pop();
      const filePath = `${user.companyId}/${renewRecord.id}/renew_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('manutencao-anexos').upload(filePath, renewFile);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('manutencao-anexos').getPublicUrl(filePath);
        arquivoUrl = urlData.publicUrl;
        await supabase.from('maintenance_attachments').insert({
          company_id: user.companyId, maintenance_record_id: renewRecord.id, nome_arquivo: renewFile.name,
          arquivo_url: urlData.publicUrl, tipo_documento: 'Ordem de serviço', uploaded_by: userId, uploaded_by_nome: user.nome,
        });
      }
    }

    // Create history entry
    await supabase.from('maintenance_history').insert({
      company_id: user.companyId, maintenance_record_id: renewRecord.id, tipo: 'renovacao',
      descricao: renewObs || `Manutenção renovada. Nova validade: ${renewDate}`,
      usuario_id: userId, usuario_nome: user.nome,
      dados_anteriores: oldData, dados_novos: { data_validade: renewDate, manutencao_preventiva: today },
      arquivo_url: arquivoUrl || null,
    });

    setRenewLoading(false);
    setRenewRecord(null);
    toast({ title: 'Manutenção renovada com sucesso!' });
    loadRecords();
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
                    <TableHead>Localização</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('dias')}>
                      Dias <ArrowUpDown className="w-3 h-3 inline ml-1" />
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
                  ) : (
                    filtered.map((r, i) => {
                      const dias = calcDias(r.data_validade);
                      const vencido = dias <= 0;
                      const proximo = dias > 0 && dias <= 15;
                      const childCount = records.filter(c => c.parent_id === r.id).length;
                      const location = [r.setor, r.sala, r.andar].filter(Boolean).join(' / ');
                      return (
                        <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(r)}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-medium">
                            {r.equipamento}
                            {childCount > 0 && <Badge variant="outline" className="ml-2 text-xs">{childCount} sub</Badge>}
                          </TableCell>
                          <TableCell>{r.controle}</TableCell>
                          <TableCell>{r.frequencia}</TableCell>
                          <TableCell>{r.empresa_prestadora}</TableCell>
                          <TableCell>{location || '—'}</TableCell>
                          <TableCell>{fmt(r.data_validade)}</TableCell>
                          <TableCell className={vencido ? 'text-red-600 font-bold' : proximo ? 'text-yellow-600 font-bold' : 'text-green-600 font-bold'}>{dias}</TableCell>
                          <TableCell>
                            <Badge variant={vencido ? 'destructive' : 'default'}
                              className={proximo ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' : !vencido ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                              {vencido ? 'VENCIDO' : proximo ? 'PRÓXIMO' : 'EM DIA'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              {canEdit && dias <= 15 && (
                                <Button variant="ghost" size="icon" title="Renovar" onClick={() => openRenew(r)}>
                                  <RotateCcw className="w-4 h-4 text-blue-500" />
                                </Button>
                              )}
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

        {/* Detail Dialog */}
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedRecord?.equipamento}</DialogTitle>
            </DialogHeader>
            <Tabs value={detailTab} onValueChange={setDetailTab}>
              <TabsList className="w-full">
                <TabsTrigger value="info" className="flex-1">Informações</TabsTrigger>
                <TabsTrigger value="subgroups" className="flex-1">Subgrupos ({subgroups.length})</TabsTrigger>
                <TabsTrigger value="attachments" className="flex-1">Anexos ({attachments.length})</TabsTrigger>
                <TabsTrigger value="history" className="flex-1">Histórico ({history.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-3 mt-4">
                {selectedRecord && (() => {
                  const r = selectedRecord;
                  const dias = calcDias(r.data_validade);
                  const location = [r.setor, r.sala, r.andar].filter(Boolean).join(' / ');
                  return (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Controle:</span> <strong>{r.controle}</strong></div>
                      <div><span className="text-muted-foreground">Frequência:</span> <strong>{r.frequencia}</strong></div>
                      <div><span className="text-muted-foreground">Empresa:</span> <strong>{r.empresa_prestadora}</strong></div>
                      <div><span className="text-muted-foreground">Preventiva:</span> <strong>{fmt(r.manutencao_preventiva)}</strong></div>
                      <div><span className="text-muted-foreground">Corretiva:</span> <strong>{fmt(r.manutencao_corretiva)}</strong></div>
                      <div><span className="text-muted-foreground">Validade:</span> <strong>{fmt(r.data_validade)}</strong></div>
                      <div><span className="text-muted-foreground">Dias p/ Vencer:</span> <strong className={dias <= 0 ? 'text-red-600' : dias <= 15 ? 'text-yellow-600' : 'text-green-600'}>{dias}</strong></div>
                      {location && <div className="col-span-2"><MapPin className="w-3 h-3 inline mr-1" /><span className="text-muted-foreground">Localização:</span> <strong>{location}</strong></div>}
                      {r.observacoes && <div className="col-span-2"><span className="text-muted-foreground">Observações:</span> <p className="mt-1">{r.observacoes}</p></div>}
                      {canEdit && dias <= 15 && (
                        <div className="col-span-2 pt-2">
                          <Button size="sm" onClick={() => { setSelectedRecord(null); openRenew(r); }}>
                            <RotateCcw className="w-4 h-4 mr-1" /> Renovar Manutenção
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="subgroups" className="mt-4">
                {subgroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum subgrupo. Cadastre equipamentos vinculados a este.</p>
                ) : (
                  <div className="space-y-2">
                    {subgroups.map(s => {
                      const dias = calcDias(s.data_validade);
                      const vencido = dias <= 0;
                      return (
                        <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{s.equipamento}</p>
                            <p className="text-xs text-muted-foreground">{s.controle} • {s.frequencia}</p>
                          </div>
                          <Badge variant={vencido ? 'destructive' : 'default'} className={!vencido ? 'bg-green-100 text-green-800' : ''}>
                            {vencido ? 'VENCIDO' : 'EM DIA'} ({dias}d)
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
                {canEdit && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => { setSelectedRecord(null); navigate('/manutencao/cadastro'); }}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar Subgrupo
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="attachments" className="mt-4 space-y-4">
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
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum anexo.</p>
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
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum histórico registrado.</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {history.map(h => (
                      <div key={h.id} className="border-l-2 border-primary/30 pl-3 py-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">{h.tipo}</Badge>
                          <span className="text-muted-foreground">{new Date(h.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm mt-1">{h.descricao}</p>
                        <p className="text-xs text-muted-foreground">por {h.usuario_nome}</p>
                        {h.arquivo_url && (
                          <a href={h.arquivo_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                            <Paperclip className="w-3 h-3" /> Ver comprovante
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Renewal Dialog */}
        <Dialog open={!!renewRecord} onOpenChange={() => setRenewRecord(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5" /> Renovar Manutenção
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Equipamento: <strong>{renewRecord?.equipamento}</strong></p>
              <div>
                <Label>Nova Data de Validade *</Label>
                <Input type="date" value={renewDate} onChange={e => setRenewDate(e.target.value)} />
              </div>
              <div>
                <Label>Comprovante / OS (opcional)</Label>
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setRenewFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={renewObs} onChange={e => setRenewObs(e.target.value)} placeholder="Detalhes da renovação..." />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleRenew} disabled={renewLoading || !renewDate}>
                  {renewLoading ? 'Renovando...' : 'Confirmar Renovação'}
                </Button>
                <Button variant="outline" onClick={() => setRenewRecord(null)}>Cancelar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default ListagemManutencao;
