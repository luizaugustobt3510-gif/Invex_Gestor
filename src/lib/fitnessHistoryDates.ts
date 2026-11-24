export function validFitnessDateRange(from: string, to: string) {
  return !from || !to || from <= to;
}

export function inFitnessDateRange(date: string, from: string, to: string) {
  const day = date.slice(0, 10);
  return validFitnessDateRange(from, to) && (!from || day >= from) && (!to || day <= to);
}