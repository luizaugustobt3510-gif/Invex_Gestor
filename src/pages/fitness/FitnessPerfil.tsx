import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FitnessLayout } from '@/components/fitness/FitnessLayout';
import { FitnessCard } from '@/components/fitness/FitnessCard';
import { AvatarMascote } from '@/components/fitness/AvatarMascote';
import { FITNESS_AVATARS } from './avatars';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Save, History, Trophy, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface FormState {
  nome: string;
  mascote_nome: string;
  avatar_id: string;
  peso_atual: string;
  altura: string;
  meta_peso: string;
  meta_freq_semanal: string;
  meta_sono_horas: string;
}

const FitnessPerfil = () => {
  const { profile, update, loading } = useFitnessProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        nome: profile.nome || '',
        mascote_nome: profile.mascote_nome || '',
        avatar_id: profile.avatar_id || '',
        peso_atual: profile.peso_atual != null ? String(profile.peso_atual) : '',
        altura: profile.altura != null ? String(profile.altura) : '',
        meta_peso: profile.meta_peso != null ? String(profile.meta_peso) : '',
        meta_freq_semanal: profile.meta_freq_semanal != null ? String(profile.meta_freq_semanal) : '',
        meta_sono_horas: profile.meta_sono_horas != null ? String(profile.meta_sono_horas) : '8',
      });
    }
  }, [profile?.id]);

  if (loading || !profile || !form) {
    return <FitnessLayout><div className="text-center py-20 text-cyan-300">Carregando...</div></FitnessLayout>;
  }

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => (f ? { ...f, [k]: v } : f));

  const parseNum = (s: string): number | null => {
    if (!s.trim()) return null;
    const n = parseFloat(s.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  const salvar = async () => {
    setSaving(true);
    try {
      const r = await update({
        nome: form.nome.trim() || profile.nome,
        mascote_nome: form.mascote_nome,
        avatar_id: form.avatar_id,
        peso_atual: parseNum(form.peso_atual),
        altura: parseNum(form.altura),
        meta_peso: parseNum(form.meta_peso),
        meta_freq_semanal: form.meta_freq_semanal ? Math.round(parseNum(form.meta_freq_semanal) || 0) : null,
        meta_sono_horas: parseNum(form.meta_sono_horas),
      });
      if (r?.error) throw r.error;
      toast.success('Perfil salvo!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const uploadFoto = async (file: File) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ext = file.name.split('.').pop();
      const path = `${user.id}/profile-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('fitness-photos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: signedData } = await supabase.storage.from('fitness-photos').createSignedUrl(path, 60 * 60 * 24 * 365);
      await update({ foto_url: signedData?.signedUrl || path });
      toast.success('Foto atualizada!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  return (
    <FitnessLayout>
      <h1 className="text-2xl font-black mb-4">Meu Perfil</h1>

      <FitnessCard className="mb-4 flex flex-col items-center text-center">
        <div className="relative">
          {profile.foto_url ? (
            <img src={profile.foto_url} alt="Foto" className="w-28 h-28 rounded-full object-cover border-2 border-cyan-400" />
          ) : (
            <AvatarMascote avatarId={form.avatar_id} mascoteNome="" size="md" />
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-cyan-400 text-slate-900 flex items-center justify-center shadow-lg"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={e => e.target.files?.[0] && uploadFoto(e.target.files[0])}
        />
        <input
          value={form.nome}
          onChange={e => setField('nome', e.target.value)}
          className="mt-4 text-xl font-bold text-center bg-transparent border-b border-slate-700 focus:border-cyan-400 focus:outline-none text-base"
        />
      </FitnessCard>

      <FitnessCard className="mb-4">
        <h2 className="font-semibold mb-3 text-sm">Mascote</h2>
        <div className="grid grid-cols-4 gap-2">
          {FITNESS_AVATARS.map(a => (
            <button
              key={a.id}
              onClick={() => setField('avatar_id', a.id)}
              className={`rounded-xl p-2 border ${
                form.avatar_id === a.id ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-700'
              }`}
            >
              <img src={a.src} alt={a.nome} className="w-full h-16 object-contain" loading="lazy" />
              <p className="text-[10px] mt-1">{a.nome}</p>
            </button>
          ))}
        </div>
        <input
          value={form.mascote_nome}
          onChange={e => setField('mascote_nome', e.target.value)}
          placeholder="Nome do mascote"
          className="w-full mt-3 h-11 px-3 rounded-lg bg-slate-800/60 border border-slate-700 focus:border-cyan-400 focus:outline-none text-base"
        />
      </FitnessCard>

      <FitnessCard className="mb-4">
        <h2 className="font-semibold mb-3 text-sm">Dados físicos</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso atual (kg)" value={form.peso_atual} onChange={v => setField('peso_atual', v)} />
          <Field label="Altura (cm)" value={form.altura} onChange={v => setField('altura', v)} />
          <Field label="Meta de peso (kg)" value={form.meta_peso} onChange={v => setField('meta_peso', v)} />
          <Field label="Treinos/semana" value={form.meta_freq_semanal} onChange={v => setField('meta_freq_semanal', v)} step="1" />
          <Field label="Meta de sono (h)" value={form.meta_sono_horas} onChange={v => setField('meta_sono_horas', v)} step="0.5" />
        </div>
      </FitnessCard>

      <button
        onClick={salvar}
        disabled={saving}
        className="w-full h-14 rounded-2xl font-black text-slate-900 text-base flex items-center justify-center gap-2 mb-4 active:scale-[0.98] disabled:opacity-60"
        style={{
          background: 'linear-gradient(90deg, #22d3ee, #e879f9)',
          boxShadow: '0 8px 24px rgba(34,211,238,0.25)',
        }}
      >
        <Save className="w-5 h-5" /> {saving ? 'Salvando...' : 'Salvar perfil'}
      </button>
    </FitnessLayout>
  );
};

const Field = ({
  label,
  value,
  onChange,
  step = '0.1',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) => (
  <div>
    <label className="text-[10px] uppercase tracking-wide text-slate-400">{label}</label>
    <input
      type="number"
      inputMode="decimal"
      step={step}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-11 mt-1 px-3 rounded-lg bg-slate-800/60 border border-slate-700 focus:border-cyan-400 focus:outline-none text-base"
    />
  </div>
);

export default FitnessPerfil;
