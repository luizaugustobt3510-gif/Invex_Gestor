import { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SignaturePad, SignaturePadHandle } from '@/components/SignaturePad';
import { PenLine, Save, Ban } from 'lucide-react';

export type DocumentSignatureMode = 'none' | 'saved' | 'now';

export interface DocumentSignatureValue {
  mode: DocumentSignatureMode;
  dataUrl?: string; // Base64 dataURL when drawn now
  signatureId?: string; // Reference to saved signature
  signedUrl?: string; // Resolved URL for saved
  nome?: string;
  credencial?: string;
}

interface Props {
  label?: string;
  onChange: (v: DocumentSignatureValue) => void;
  /** Filter saved signatures by sector id (optional) */
  sectorId?: string;
}

interface SavedSig {
  id: string;
  nome: string;
  credencial: string | null;
  image_url: string;
  is_default: boolean;
  sector_id: string | null;
  _signed?: string;
}

export function DocumentSignaturePicker({ label = 'Assinatura', onChange, sectorId }: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<DocumentSignatureMode>('saved');
  const [sigs, setSigs] = useState<SavedSig[]>([]);
  const [sigId, setSigId] = useState('');
  const padRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    (async () => {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) return;
      const { data } = await supabase
        .from('user_signatures')
        .select('id, nome, credencial, image_url, is_default, sector_id')
        .eq('user_id', authUser.user.id)
        .order('is_default', { ascending: false });
      const rows = (data || []) as SavedSig[];
      const withUrls = await Promise.all(rows.map(async (s) => {
        if (s.image_url.startsWith('data:')) return { ...s, _signed: s.image_url };
        // Download via storage client and inline as data URL — this avoids CORS issues
        // when downstream consumers (Evolução PDF, edge functions) embed the image.
        try {
          const { data: blob } = await supabase.storage.from('signatures').download(s.image_url);
          if (blob) {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const fr = new FileReader();
              fr.onload = () => resolve(String(fr.result));
              fr.onerror = () => reject(fr.error);
              fr.readAsDataURL(blob);
            });
            return { ...s, _signed: dataUrl };
          }
        } catch { /* fall through */ }
        const { data: signed } = await supabase.storage.from('signatures').createSignedUrl(s.image_url, 3600);
        return { ...s, _signed: signed?.signedUrl || '' };
      }));
      setSigs(withUrls);
      const def = withUrls.find(s => s.is_default) || withUrls[0];
      if (def) {
        setSigId(def.id);
        emit('saved', undefined, def);
      } else {
        setMode('none');
        onChange({ mode: 'none' });
      }
    })();
    // eslint-disable-next-line
  }, [user?.companyId]);

  const filtered = sectorId ? sigs.filter(s => !s.sector_id || s.sector_id === sectorId) : sigs;

  const emit = (m: DocumentSignatureMode, dataUrl?: string, saved?: SavedSig) => {
    if (m === 'none') return onChange({ mode: 'none' });
    if (m === 'now') return onChange({ mode: 'now', dataUrl });
    if (m === 'saved' && saved) return onChange({
      mode: 'saved',
      signatureId: saved.id,
      signedUrl: saved._signed,
      nome: saved.nome,
      credencial: saved.credencial || undefined,
    });
  };

  const handleModeChange = (m: DocumentSignatureMode) => {
    setMode(m);
    if (m === 'none') emit('none');
    if (m === 'saved') {
      const s = filtered.find(x => x.id === sigId) || filtered[0];
      if (s) { setSigId(s.id); emit('saved', undefined, s); }
    }
    if (m === 'now') emit('now', padRef.current?.toDataURL() || undefined);
  };

  const handleSavedChange = (id: string) => {
    setSigId(id);
    const s = filtered.find(x => x.id === id);
    if (s) emit('saved', undefined, s);
  };

  const handlePadEnd = () => {
    const dataUrl = padRef.current?.toDataURL() || undefined;
    emit('now', dataUrl);
  };

  return (
    <div className="rounded-lg border p-3 bg-muted/20 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex gap-1 flex-wrap">
          <Button type="button" size="sm" variant={mode === 'saved' ? 'default' : 'outline'}
            disabled={filtered.length === 0}
            onClick={() => handleModeChange('saved')}>
            <Save className="w-3.5 h-3.5 mr-1" /> Salva
          </Button>
          <Button type="button" size="sm" variant={mode === 'now' ? 'default' : 'outline'}
            onClick={() => handleModeChange('now')}>
            <PenLine className="w-3.5 h-3.5 mr-1" /> Assinar agora
          </Button>
          <Button type="button" size="sm" variant={mode === 'none' ? 'default' : 'outline'}
            onClick={() => handleModeChange('none')}>
            <Ban className="w-3.5 h-3.5 mr-1" /> Sem
          </Button>
        </div>
      </div>

      {mode === 'saved' && (
        filtered.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            Você ainda não tem assinaturas cadastradas.
          </div>
        ) : (
          <>
            <Select value={sigId} onValueChange={handleSavedChange}>
              <SelectTrigger><SelectValue placeholder="Selecione uma assinatura" /></SelectTrigger>
              <SelectContent>
                {filtered.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}{s.credencial ? ` — ${s.credencial}` : ''}{s.is_default ? ' (padrão)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filtered.find(x => x.id === sigId)?._signed && (
              <img
                src={filtered.find(x => x.id === sigId)!._signed}
                alt="preview"
                className="mt-2 max-h-24 bg-white rounded border p-1"
              />
            )}
          </>
        )
      )}
      {mode === 'now' && (
        <div onPointerUp={handlePadEnd}>
          <SignaturePad ref={padRef} height={140} />
        </div>
      )}
      {mode === 'none' && (
        <div className="text-xs text-muted-foreground italic py-2">
          Este documento será gerado sem assinatura.
        </div>
      )}
    </div>
  );
}
