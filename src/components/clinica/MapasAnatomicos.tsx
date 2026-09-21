import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Upload, Pencil, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CATEGORIA_LABELS } from './anatomyMaps';
import { useAnatomicalRegions } from '@/hooks/useAnatomicalRegions';
import { useAnatomicalMaps, ANATOMICAL_MAPS_BUCKET, MapPoint } from '@/hooks/useAnatomicalMaps';

const CATEGORIAS = Object.keys(CATEGORIA_LABELS);

interface MapForm {
  nome: string; categoria: string; vista: string; ordem: number; is_active: boolean;
}
const emptyMap: MapForm = { nome: '', categoria: 'cabeca', vista: 'frente', ordem: 0, is_active: true };

/** Editor administrativo de mapas anatômicos (imagem + áreas desenhadas). */
export function MapasAnatomicos() {
  const { user } = useAuth();
  const { regions } = useAnatomicalRegions(true);
  const { maps, loading, reload } = useAnatomicalMaps(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MapForm>(emptyMap);
  const [saving, setSaving] = useState(false);

  const [selectedId, setSelectedId] = useState<string>('');
  const selected = maps.find(m => m.id === selectedId) || maps[0];

  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [pendingRegion, setPendingRegion] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const regionById = useMemo(() => {
    const m: Record<string, typeof regions[number]> = {};
    regions.forEach(r => { m[r.id] = r; });
    return m;
  }, [regions]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyMap, ordem: (maps.reduce((m, x) => Math.max(m, x.ordem), 0) || 0) + 10 });
    setDialogOpen(true);
  };

  const openEdit = (id: string) => {
    const m = maps.find(x => x.id === id);
    if (!m) return;
    setEditingId(m.id);
    setForm({ nome: m.nome, categoria: m.categoria, vista: m.vista, ordem: m.ordem, is_active: m.is_active });
    setDialogOpen(true);
  };

  const saveMap = async () => {
    if (!user?.companyId || saving) return;
    if (!form.nome.trim()) { toast.error('Informe o nome do mapa'); return; }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        categoria: form.categoria,
        vista: form.vista.trim() || 'frente',
        ordem: Number(form.ordem) || 0,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from('anatomical_maps').update(payload).eq('id', editingId);
        if (error) { toast.error(error.message); return; }
        toast.success('Mapa atualizado');
      } else {
        const { data, error } = await supabase.from('anatomical_maps')
          .insert({ ...payload, company_id: user.companyId }).select('id').single();
        if (error) { toast.error(error.message); return; }
        setSelectedId(data.id);
        toast.success('Mapa criado');
      }
      setDialogOpen(false);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const removeMap = async (id: string) => {
    if (!confirm('Excluir este mapa e suas áreas?')) return;
    const { error } = await supabase.from('anatomical_maps').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Mapa excluído');
    setSelectedId('');
    reload();
  };

  const uploadImage = async (file: File) => {
    if (!user?.companyId || !selected) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `${user.companyId}/${selected.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(ANATOMICAL_MAPS_BUCKET).upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { error: upErr } = await supabase.from('anatomical_maps')
      .update({ image_path: path }).eq('id', selected.id);
    if (upErr) { toast.error(upErr.message); return; }
    toast.success('Imagem enviada');
    reload();
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPoints(p => [...p, { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) }]);
  };

  const saveArea = async () => {
    if (!user?.companyId || !selected) return;
    if (points.length < 3) { toast.error('Marque pelo menos 3 pontos'); return; }
    if (!pendingRegion) { toast.error('Escolha a região correspondente'); return; }
    const { error } = await supabase.from('anatomical_map_regions').insert({
      company_id: user.companyId,
      map_id: selected.id,
      region_id: pendingRegion,
      points: points as any,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Área salva');
    setPoints([]); setPendingRegion(''); setDrawing(false);
    reload();
  };

  const removeArea = async (id: string) => {
    const { error } = await supabase.from('anatomical_map_regions').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Área excluída');
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {maps.map(m => (
            <Button
              key={m.id} type="button" size="sm"
              variant={selected?.id === m.id ? 'default' : 'outline'}
              onClick={() => setSelectedId(m.id)}
            >
              {m.nome} · {m.vista}{!m.is_active && ' (inativo)'}
            </Button>
          ))}
          {!loading && maps.length === 0 && (
            <span className="text-sm text-muted-foreground">Nenhum mapa cadastrado.</span>
          )}
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Novo mapa</Button>
      </div>

      {selected && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{CATEGORIA_LABELS[selected.categoria] || selected.categoria}</Badge>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(selected.id)}>
              <Pencil className="w-3.5 h-3.5" /> Editar dados
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => fileRef.current?.click()}>
              <Upload className="w-3.5 h-3.5" /> {selected.image_path ? 'Substituir imagem' : 'Enviar imagem'}
            </Button>
            <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => removeMap(selected.id)}>
              <Trash2 className="w-3.5 h-3.5" /> Excluir mapa
            </Button>
            <input
              ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }}
            />
          </div>

          {!selected.imageUrl ? (
            <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
              Envie uma imagem anatômica para começar a marcar as áreas.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                {!drawing ? (
                  <Button size="sm" onClick={() => { setDrawing(true); setPoints([]); }} className="gap-1">
                    <Plus className="w-3.5 h-3.5" /> Adicionar região
                  </Button>
                ) : (
                  <>
                    <Select value={pendingRegion} onValueChange={setPendingRegion}>
                      <SelectTrigger className="h-9 w-[240px] text-xs">
                        <SelectValue placeholder="Escolha a região" />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={saveArea} className="gap-1">
                      <Check className="w-3.5 h-3.5" /> Salvar área ({points.length} pontos)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPoints(p => p.slice(0, -1))}>
                      Desfazer ponto
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1"
                      onClick={() => { setDrawing(false); setPoints([]); setPendingRegion(''); }}>
                      <X className="w-3.5 h-3.5" /> Cancelar
                    </Button>
                  </>
                )}
              </div>

              <div
                className={`relative w-full max-w-[520px] mx-auto ${drawing ? 'cursor-crosshair' : ''}`}
                onClick={onCanvasClick}
              >
                <img src={selected.imageUrl} alt={selected.nome} className="w-full h-auto rounded-md pointer-events-none" />
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                  {selected.regions.map(mr => mr.points.length >= 3 && (
                    <polygon
                      key={mr.id}
                      points={mr.points.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="hsl(var(--primary) / 0.25)"
                      stroke="hsl(var(--primary))"
                      strokeWidth={0.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {points.length > 0 && (
                    <polygon
                      points={points.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="hsl(var(--destructive) / 0.2)"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={0.6}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={0.9} fill="hsl(var(--destructive))" />
                  ))}
                </svg>
              </div>
              {drawing && (
                <p className="text-xs text-muted-foreground text-center">
                  Clique na imagem para marcar os pontos que contornam a região.
                </p>
              )}
            </>
          )}

          <div className="space-y-1">
            <div className="text-sm font-semibold">Áreas marcadas</div>
            {selected.regions.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma área marcada neste mapa.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {selected.regions.map(mr => (
                  <div key={mr.id} className="flex items-center justify-between gap-2 border rounded-lg px-3 py-2">
                    <span className="text-sm truncate">
                      {regionById[mr.region_id]?.nome || 'Região removida'}
                      <span className="text-muted-foreground text-xs"> · {mr.points.length} pontos</span>
                    </span>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeArea(mr.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar mapa' : 'Novo mapa anatômico'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Cabeça" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vista</Label>
                <Input value={form.vista} onChange={e => setForm({ ...form, vista: e.target.value })} placeholder="frente, perfil, costas..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label>Ordem de exibição</Label>
                <Input type="number" value={form.ordem} onChange={e => setForm({ ...form, ordem: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label className="mb-0">Ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={saveMap} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
