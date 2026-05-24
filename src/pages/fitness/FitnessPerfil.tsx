import { useRef, useState } from 'react';
import { FitnessLayout } from '@/components/fitness/FitnessLayout';
import { FitnessCard } from '@/components/fitness/FitnessCard';
import { AvatarMascote } from '@/components/fitness/AvatarMascote';
import { FITNESS_AVATARS } from './avatars';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Save } from 'lucide-react';
import { toast } from 'sonner';

const FitnessPerfil = () => {
  const { profile, update, loading } = useFitnessProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (loading || !profile) {
    return <FitnessLayout><div className="text-center py-20 text-cyan-300">Carregando...</div></FitnessLayout>;
  }

  const uploadFoto = async (file: File) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ext = file.name.split('.').pop();
      const path = `${user.id}/profile-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('fitness-photos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('fitness-photos').createSignedUrl(path, 60 * 60 * 24 * 365);
      const signed = (await data).data?.signedUrl;
      await update({ foto_url: signed || path });
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
            <AvatarMascote avatarId={profile.avatar_id} mascoteNome="" size="md" />
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
          value={profile.nome}
          onChange={e => update({ nome: e.target.value })}
          className="mt-4 text-xl font-bold text-center bg-transparent border-b border-slate-700 focus:border-cyan-400 focus:outline-none text-base"
        />
      </FitnessCard>

      <FitnessCard className="mb-4">
        <h2 className="font-semibold mb-3 text-sm">Mascote</h2>
        <div className="grid grid-cols-4 gap-2">
          {FITNESS_AVATARS.map(a => (
            <button
              key={a.id}
              onClick={() => update({ avatar_id: a.id })}
              className={`rounded-xl p-2 border ${
                profile.avatar_id === a.id ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-700'
              }`}
            >
              <img src={a.src} alt={a.nome} className="w-full h-16 object-contain" />
              <p className="text-[10px] mt-1">{a.nome}</p>
            </button>
          ))}
        </div>
        <input
          value={profile.mascote_nome}
          onChange={e => update({ mascote_nome: e.target.value })}
          placeholder="Nome do mascote"
          className="w-full mt-3 h-11 px-3 rounded-lg bg-slate-800/60 border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-base"
        />
      </FitnessCard>

      <FitnessCard className="mb-4">
        <h2 className="font-semibold mb-3 text-sm">Dados físicos</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso atual (kg)" value={profile.peso_atual} onChange={v => update({ peso_atual: v })} />
          <Field label="Altura (cm)" value={profile.altura} onChange={v => update({ altura: v })} />
          <Field label="Meta de peso (kg)" value={profile.meta_peso} onChange={v => update({ meta_peso: v })} />
          <Field label="Treinos/semana" value={profile.meta_freq_semanal} onChange={v => update({ meta_freq_semanal: v ? Math.round(v) : null })} />
        </div>
      </FitnessCard>
    </FitnessLayout>
  );
};

const Field = ({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) => (
  <div>
    <label className="text-[10px] uppercase tracking-wide text-slate-400">{label}</label>
    <input
      type="number"
      step="0.1"
      value={value ?? ''}
      onChange={e => onChange(e.target.value ? parseFloat(e.target.value) : null)}
      className="w-full h-11 mt-1 px-3 rounded-lg bg-slate-800/60 border border-slate-700 focus:border-cyan-400 focus:outline-none text-base"
    />
  </div>
);

export default FitnessPerfil;
