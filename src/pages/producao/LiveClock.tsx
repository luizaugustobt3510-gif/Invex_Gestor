import { useEffect, useState } from 'react';

/** Relógio isolado: atualiza só a si mesmo, sem redesenhar o formulário inteiro. */
export function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return <>{now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</>;
}
