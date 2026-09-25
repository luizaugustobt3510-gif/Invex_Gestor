ALTER TABLE public.user_signatures ADD COLUMN IF NOT EXISTS linked_user_id uuid NULL;
CREATE INDEX IF NOT EXISTS idx_user_signatures_linked_user ON public.user_signatures(linked_user_id);
COMMENT ON COLUMN public.user_signatures.linked_user_id IS 'Usuário (técnico) ao qual a assinatura compartilhada pertence; quando definido, só esse usuário a vê na anamnese.';