import { useEffect, useRef, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SignaturePad, SignaturePadHandle } from '@/components/SignaturePad';
import { PenLine, Trash2, Upload, Star, Loader2, Plus, Image as ImageIcon } from 'lucide-react';

interface Signature {
  id: string;
  nome: string;
  credencial: string | null;
  image_url: string;
  is_default: boolean;
  sector_id: string | null;
  sector_nome: string | null;
  created_at: string;
}
interface Sector { id: string; nome: string; }

export default function Assinaturas() {
  const { user } = useAuth();
  const [items, setItems] = useState<Signature[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [credencial, setCredencial] = useState('');
  const [sectorId, setSectorId] = useState<string>('');
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [urlsCache, setUrlsCache] = useState<Record<string, string>>({});
  const padRef = useRef<SignaturePadHandle>(null);

  const load = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser.user) return;
    const [sigRes, secRes] = await Promise.all([
      supabase.from('user_signatures').select('*').eq('user_id', authUser.user.id).order('is_default', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('sectors').select('id, nome').eq('company_id', user.companyId).order('nome'),
    ]);
    setSectors((secRes.data as Sector[]) || []);
    if (sigRes.error) toast.error('Erro ao carregar assinaturas');
    else {
      const rows = (sigRes.data || []) as Signature[];
      setItems(rows);
      const cache: Record<string, string> = {};
      await Promise.all(rows.map(async (r) => {
        if (r.image_url.startsWith('data:') || r.image_url.startsWith('http')) { cache[r.id] = r.image_url; return; }
        const { data: s } = await supabase.storage.from('signatures').createSignedUrl(r.image_url, 3600);
        if (s?.signedUrl) cache[r.id] = s.signedUrl;
      }));
      setUrlsCache(cache);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.companyId]);

  const reset = () => {
    setNome('');
    setCredencial('');
    setSectorId('');
    setUploadFile(null);
    setMode('draw');
    padRef.current?.clear();
    setShowForm(false);
  };

  const save = async () => {
    if (!user?.companyId) return;
    if (!nome.trim()) { toast.error('Informe o nome'); return; }
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser.user) return;

    let imagePath: string;
    setSaving(true);
    try {
      if (mode === 'draw') {
        const dataUrl = padRef.current?.toDataURL();
        if (!dataUrl) { toast.error('Desenhe a assinatura'); setSaving(false); return; }
        const blob = await (await fetch(dataUrl)).blob();
        const path = `${authUser.user.id}/${Date.now()}.png`;
        const { error } = await supabase.storage.from('signatures').upload(path, blob, { contentType: 'image/png', upsert: false });
        if (error) throw error;
        imagePath = path;
      } else {
        if (!uploadFile) { toast.error('Selecione uma imagem'); setSaving(false); return; }
        const ext = uploadFile.name.split('.').pop() || 'png';
        const path = `${authUser.user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('signatures').upload(path, uploadFile, { upsert: false });
        if (error) throw error;
        imagePath = path;
      }

      const sector = sectors.find(s => s.id === sectorId);
      const { error } = await supabase.from('user_signatures').insert({
        user_id: authUser.user.id,
        company_id: user.companyId,
        nome: nome.trim(),
        credencial: credencial.trim() || null,
        image_url: imagePath,
        is_default: items.length === 0,
        sector_id: sectorId || null,
        sector_nome: sector?.nome || null,
      });
      if (error) throw error;
      toast.success('Assinatura salva');
      reset();
      await load();
    } catch (e: any) {
      toast.error('Erro ao salvar', { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id: string) => {
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser.user) return;
    await supabase.from('user_signatures').update({ is_default: false }).eq('user_id', authUser.user.id);
    await supabase.from('user_signatures').update({ is_default: true }).eq('id', id);
    load();
  };

  const remove = async (item: Signature) => {
    if (!confirm(`Excluir assinatura "${item.nome}"?`)) return;
    if (!item.image_url.startsWith('http') && !item.image_url.startsWith('data:')) {
      await supabase.storage.from('signatures').remove([item.image_url]);
    }
    const { error } = await supabase.from('user_signatures').delete().eq('id', item.id);
    if (error) toast.error('Erro ao excluir'); else { toast.success('Excluída'); load(); }
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <PenLine className="w-5 h-5" /> Minhas Assinaturas Eletrônicas
            </CardTitle>
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" /> Nova assinatura
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {showForm && (
              <div className="space-y-4 rounded-lg border p-3 sm:p-4 bg-muted/20 mb-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nome *</Label>
                    <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Dr. João Silva" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>CRM / Registro / Cargo</Label>
                    <Input value={credencial} onChange={(e) => setCredencial(e.target.value)} placeholder="CRM/SP 123456" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant={mode === 'draw' ? 'default' : 'outline'} size="sm" onClick={() => setMode('draw')}>
                    <PenLine className="w-4 h-4 mr-1" /> Desenhar
                  </Button>
                  <Button type="button" variant={mode === 'upload' ? 'default' : 'outline'} size="sm" onClick={() => setMode('upload')}>
                    <Upload className="w-4 h-4 mr-1" /> Enviar imagem
                  </Button>
                </div>

                {mode === 'draw' ? (
                  <SignaturePad ref={padRef} height={160} />
                ) : (
                  <div className="space-y-2">
                    <Input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                    {uploadFile && (
                      <div className="text-xs text-muted-foreground">Arquivo: {uploadFile.name}</div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={reset} disabled={saving}>Cancelar</Button>
                  <Button onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                    Salvar
                  </Button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma assinatura cadastrada.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => (
                  <div key={s.id} className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="aspect-[3/1] w-full rounded bg-white flex items-center justify-center overflow-hidden border">
                      {urlsCache[s.id] ? (
                        <img src={urlsCache[s.id]} alt={s.nome} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-center text-xs">
                      <div className="font-medium">{s.nome}</div>
                      {s.credencial && <div className="text-muted-foreground">{s.credencial}</div>}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {s.is_default ? (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <Star className="w-3 h-3" /> Padrão
                        </Badge>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDefault(s.id)}>
                          <Star className="w-3 h-3 mr-1" /> Definir padrão
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(s)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
