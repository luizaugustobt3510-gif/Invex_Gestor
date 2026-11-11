import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Trash2, Upload } from 'lucide-react';
import { APP_DOWNLOADS_BUCKET, AppDownload, PRODUTOS, downloadApp, formatSize } from '@/lib/appDownloads';

export default function GestaoDownloads() {
  const [items, setItems] = useState<AppDownload[]>([]);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [versao, setVersao] = useState('');
  const [produto, setProduto] = useState('gestor');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('app_downloads').select('*').order('ordem');
    setItems((data as AppDownload[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const enviar = async () => {
    if (!file || !titulo.trim()) return toast.error('Informe título e arquivo.');
    setBusy(true);
    try {
      const safe = file.name.replace(/[^\w.-]+/g, '_');
      const path = `${produto}/${Date.now()}_${safe}`;
      const { error: up } = await supabase.storage.from(APP_DOWNLOADS_BUCKET).upload(path, file, { contentType: 'application/vnd.android.package-archive' });
      if (up) throw up;
      const { error } = await supabase.from('app_downloads').insert({ titulo: titulo.trim(), descricao: descricao.trim() || null, versao: versao.trim() || null, produto, file_path: path, file_size: file.size, ordem: items.length });
      if (error) throw error;
      toast.success('Arquivo publicado.');
      setTitulo(''); setDescricao(''); setVersao(''); setFile(null);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha no envio'); }
    setBusy(false);
  };

  const toggle = async (d: AppDownload) => {
    await supabase.from('app_downloads').update({ ativo: !d.ativo }).eq('id', d.id);
    setItems((s) => s.map((x) => (x.id === d.id ? { ...x, ativo: !x.ativo } : x)));
  };

  const remover = async (d: AppDownload) => {
    if (!confirm(`Excluir "${d.titulo}" definitivamente?`)) return;
    await supabase.storage.from(APP_DOWNLOADS_BUCKET).remove([d.file_path]);
    const { error } = await supabase.from('app_downloads').delete().eq('id', d.id);
    if (error) return toast.error(error.message);
    setItems((s) => s.filter((x) => x.id !== d.id));
    toast.success('Excluído.');
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-6 p-4">
        <h1 className="text-2xl font-semibold">Downloads do site</h1>
        <Card>
          <CardHeader><CardTitle className="text-base">Enviar novo APK</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div><Label>Título</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Invex Fitness para Android" /></div>
            <div><Label>Produto</Label>
              <Select value={produto} onValueChange={(v) => v && setProduto(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PRODUTOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Versão</Label><Input value={versao} onChange={(e) => setVersao(e.target.value)} placeholder="1.0.0" /></div>
            <div><Label>Arquivo (.apk, até 200 MB)</Label><Input type="file" accept=".apk,application/vnd.android.package-archive" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
            <div className="sm:col-span-2"><Label>Descrição</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Opcional" /></div>
            <Button onClick={enviar} disabled={busy} className="sm:col-span-2"><Upload className="mr-2 h-4 w-4" />{busy ? 'Enviando...' : 'Publicar no site'}</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Arquivos publicados ({items.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum arquivo ainda.</p>}
            {items.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{d.titulo} {d.versao && <span className="text-xs text-muted-foreground">v{d.versao}</span>}</p>
                  <p className="text-xs text-muted-foreground">{PRODUTOS[d.produto]} · {formatSize(d.file_size)}</p>
                </div>
                <div className="flex items-center gap-2 text-xs"><Switch checked={d.ativo} onCheckedChange={() => toggle(d)} />{d.ativo ? 'Visível' : 'Oculto'}</div>
                <Button size="icon" variant="outline" onClick={() => downloadApp(d)} aria-label="Baixar"><Download className="h-4 w-4" /></Button>
                <Button size="icon" variant="destructive" onClick={() => remover(d)} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
