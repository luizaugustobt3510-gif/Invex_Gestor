ALTER TABLE public.personal_transactions ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.personal_transactions ADD COLUMN IF NOT EXISTS color_tag text;
ALTER TABLE public.personal_transactions ADD CONSTRAINT personal_tx_color_tag_check CHECK (color_tag IS NULL OR color_tag IN ('amarelo','laranja','vermelho'));