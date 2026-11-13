export function rendimento(consumido: number, produzido: number) {
  if (!(consumido > 0)) return { rendimento: 0, perda: 0, perdaPct: 0 };
  const perda = Math.max(0, Math.round((consumido - produzido) * 1000) / 1000);
  return { rendimento: (produzido / consumido) * 100, perda, perdaPct: (perda / consumido) * 100 };
}
