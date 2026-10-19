/** Required responses accept one or many values; optional responses can be empty. */
export function isAnamneseAnswerComplete(required: boolean | undefined, raw?: string): boolean {
  if (!required) return true;
  const text = (raw || '').trim();
  if (!text) return false;
  if (text.startsWith('[')) {
    try {
      const values: unknown = JSON.parse(text);
      return Array.isArray(values) && values.some(value => String(value ?? '').trim().length > 0);
    } catch { return false; }
  }
  return true;
}

export function anamneseEntryPhase(editId: string): 'review' | 'questions' {
  return editId ? 'review' : 'questions';
}