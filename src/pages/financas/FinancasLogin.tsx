import { useEffect, useState } from 'react';
import { authErrorMessage } from '@/lib/authErrors';
import { useNavigate } from 'react-router-dom';
import { ChristmasScene } from '@/components/ChristmasScene';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Wallet } from 'lucide-react';
import { PublicCommerceFooter } from '@/components/PublicCommerceFooter';
import { isChristmasSeason } from '@/lib/financas/plan';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SEXO_OPTIONS, UF_LIST, ageFrom, formatPhone, onlyDigits, validateSignupProfile } from '@/lib/financas/signupProfile';

const APP = '/financeiro/pessoal';

const FinancasLogin = () => {
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const idade = ageFrom(nascimento);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const natal = isChristmasSeason();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate(APP, { replace: true }); });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'criar') {
      const msg = validateSignupProfile({ data_nascimento: nascimento, sexo, telefone, cidade, uf });
      if (msg) { toast.error(msg); return; }
      if (senha.length < 6) { toast.error('A senha precisa ter pelo menos 6 caracteres.'); return; }
    }
    setLoading(true);
    try {
      if (mode === 'criar') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(), password: senha,
          options: { emailRedirectTo: `${window.location.origin}${APP}`, data: {
            nome: nome.trim(), full_name: nome.trim(), data_nascimento: nascimento, sexo,
            telefone: onlyDigits(telefone), cidade: cidade.trim(), uf,
          } },
        });
        if (error) throw error;
        if (!data.session) setSent(true); else navigate(APP);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
        if (error) throw error;
        navigate(APP);
      }
    } catch (err: any) {
      toast.error(authErrorMessage(err));
    } finally { setLoading(false); }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}${APP}/entrar` });
    if (r.error) { toast.error('Falha ao entrar com Google.'); return; }
    if (r.redirected) return;
    navigate(APP);
  };

  return (
    <div className={`financas-theme ${natal ? 'financas-natal' : ''} login-scene relative min-h-[100dvh] overflow-hidden flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12`}>
      {natal && <ChristmasScene />}
      <div className="login-blob login-blob-1" aria-hidden="true" />
      <div className="login-blob login-blob-2" aria-hidden="true" />
      <div className="login-blob login-blob-3 hidden md:block" aria-hidden="true" />
      <div className="login-ring login-ring-1 hidden sm:block" aria-hidden="true" />
      <div className="login-ring login-ring-2 hidden md:block" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md md:max-w-lg">
        <div className="flex flex-col items-center mb-8">
          <div className="card-gradient-available h-14 w-14 rounded-2xl text-primary-foreground flex items-center justify-center mb-3">
            <Wallet className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Invex Finanças</h1>
          <p className="text-sm text-muted-foreground mt-1">{natal ? 'Boas festas! Feche o ano com as contas em dia. 🎄' : 'Saiba quanto você ainda pode gastar no mês.'}</p>
        </div>

        {sent ? (
          <div className="login-glass rounded-3xl p-6 sm:p-8 text-center space-y-2">
            <p className="font-medium text-foreground">Confira seu e-mail</p>
            <p className="text-sm text-muted-foreground">Enviamos um link para {email}. Clique nele para ativar sua conta gratuita.</p>
          </div>
        ) : (
          <div className="login-glass rounded-3xl p-6 sm:p-8 space-y-5">
            <Button type="button" variant="outline" className="login-ghost-btn w-full h-12" onClick={google}>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.25 1.5-1.7 4.3-5.35 4.3-3.2 0-5.85-2.65-5.85-5.95S8.8 6.4 12 6.4c1.85 0 3.05.8 3.75 1.45l2.55-2.45C16.7 3.9 14.55 3 12 3 6.95 3 3 7.05 3 12s3.95 9 9 9c5.2 0 8.65-3.65 8.65-8.8 0-.6-.05-1.05-.3-1.1z"/></svg>
              Continuar com Google
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground"><div className="login-line h-px flex-1" />ou<div className="login-line h-px flex-1" /></div>
            <form onSubmit={submit} className="space-y-4">
              {mode === 'criar' && (
                <div className="space-y-1.5"><Label htmlFor="nome">Nome</Label>
                  <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} required maxLength={100} autoComplete="name" className="login-input h-12 text-base" /></div>
              )}
              {mode === 'criar' && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="nascimento">Data de nascimento</Label>
                      <Input id="nascimento" type="date" value={nascimento} onChange={e => setNascimento(e.target.value)} required
                        max={new Date().toISOString().slice(0, 10)} autoComplete="bday" className="login-input h-12 text-base" />
                      {idade !== null && idade >= 0 && <p className="text-xs text-muted-foreground">{idade} {idade === 1 ? 'ano' : 'anos'}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sexo">Sexo</Label>
                      <Select value={sexo} onValueChange={(v) => v && setSexo(v)}>
                        <SelectTrigger id="sexo" className="login-input h-12 text-base"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{SEXO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5"><Label htmlFor="telefone">Telefone / WhatsApp</Label>
                    <Input id="telefone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(11) 91234-5678"
                      value={telefone} onChange={e => setTelefone(formatPhone(e.target.value))} required className="login-input h-12 text-base" /></div>
                  <div className="grid grid-cols-[1fr_6rem] gap-3">
                    <div className="space-y-1.5"><Label htmlFor="cidade">Cidade <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                      <Input id="cidade" value={cidade} onChange={e => setCidade(e.target.value)} maxLength={80} autoComplete="address-level2" className="login-input h-12 text-base" /></div>
                    <div className="space-y-1.5"><Label htmlFor="uf">Estado</Label>
                      <Select value={uf} onValueChange={(v) => v && setUf(v)}>
                        <SelectTrigger id="uf" className="login-input h-12 text-base"><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>{UF_LIST.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} required className="login-input h-12 text-base" /></div>
              <div className="space-y-1.5"><Label htmlFor="senha">Senha</Label>
                <Input id="senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} required className="login-input h-12 text-base" /></div>
              <Button type="submit" className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary-glow shadow-md hover:opacity-95" disabled={loading}>
                {loading ? 'Aguarde...' : mode === 'criar' ? 'Criar conta grátis' : 'Entrar'}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              {mode === 'entrar' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
              <button type="button" className="text-primary font-semibold py-2" onClick={() => setMode(mode === 'entrar' ? 'criar' : 'entrar')}>
                {mode === 'entrar' ? 'Criar grátis' : 'Entrar'}
              </button>
            </p>
          </div>
        )}
        <p className="login-footer mt-6 text-center text-xs">Invex Gestor Soluções - IGS®</p>
        <PublicCommerceFooter />
      </div>
    </div>
  );
};

export default FinancasLogin;
