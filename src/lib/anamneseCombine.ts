import type { Question } from '@/pages/clinica/AnamneseModelos';

/** Modelo adicional combinado na mesma anamnese, com as perguntas escolhidas. */
export interface ExtraSection {
  templateId: string;
  name: string;
  questions: Question[];
  selectedIds: string[];
}

export type SectionQuestion = Question & { section?: string; sectionTemplateId?: string };

/**
 * Junta o modelo principal com os exames adicionais. As perguntas adicionais
 * recebem ids prefixados (x0:, x1:...) para não colidir com o modelo principal,
 * e as condições são remapeadas para os novos ids.
 */
export function combineTemplates(
  base: { id: string; name: string; questions: Question[] },
  extras: ExtraSection[],
): SectionQuestion[] {
  const out: SectionQuestion[] = base.questions.map(q =>
    extras.length ? { ...q, section: base.name, sectionTemplateId: base.id } : q,
  );
  extras.forEach((e, i) => {
    const pre = `x${i}:`;
    const sel = new Set(e.selectedIds);
    for (const q of e.questions) {
      if (!sel.has(q.id)) continue;
      out.push({
        ...q,
        id: pre + q.id,
        // condição legada depende da pergunta anterior: só mantém se ela também foi incluída
        condition: q.condition,
        conditions: q.conditions?.map(c => ({ ...c, questionId: pre + c.questionId })),
        section: e.name,
        sectionTemplateId: e.templateId,
      });
    }
  });
  return out;
}
