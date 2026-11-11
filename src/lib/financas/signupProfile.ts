// Dados pessoais pedidos ao criar conta no Invex Finanças.
export const SEXO_OPTIONS = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "outro", label: "Outro" },
  { value: "nao_informar", label: "Prefiro não informar" },
] as const;

export const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

export const MIN_AGE = 13;

/** Idade completa em anos a partir de "AAAA-MM-DD". */
export function ageFrom(birth: string, today: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth || "");
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age--;
  return age;
}

export const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

/** Máscara (11) 91234-5678 / (11) 1234-5678. */
export function formatPhone(raw: string): string {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export type SignupProfile = { data_nascimento: string; sexo: string; telefone: string; cidade: string; uf: string };

/** Retorna a mensagem de erro, ou null se estiver tudo certo. */
export function validateSignupProfile(p: SignupProfile, today: Date = new Date()): string | null {
  const age = ageFrom(p.data_nascimento, today);
  if (age === null) return "Informe sua data de nascimento.";
  if (age < MIN_AGE) return `É preciso ter pelo menos ${MIN_AGE} anos.`;
  if (age > 120) return "Confira a data de nascimento.";
  if (!SEXO_OPTIONS.some((o) => o.value === p.sexo)) return "Selecione o sexo.";
  const tel = onlyDigits(p.telefone);
  if (tel.length < 10 || tel.length > 11) return "Informe um telefone com DDD.";
  if (p.cidade.trim().length > 80) return "Nome da cidade muito longo.";
  if (p.uf && !(UF_LIST as readonly string[]).includes(p.uf)) return "Estado inválido.";
  return null;
}
