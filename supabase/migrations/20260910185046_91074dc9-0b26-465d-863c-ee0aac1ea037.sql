-- 1) Assinaturas: tipo, ativo e dados de certificado ICP-Brasil
ALTER TABLE public.user_signatures
  ADD COLUMN IF NOT EXISTS signature_type text NOT NULL DEFAULT 'medico',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS icp_titular text,
  ADD COLUMN IF NOT EXISTS icp_serie text,
  ADD COLUMN IF NOT EXISTS icp_validade date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_signatures_signature_type_check'
  ) THEN
    ALTER TABLE public.user_signatures
      ADD CONSTRAINT user_signatures_signature_type_check
      CHECK (signature_type IN ('medico','tecnico'));
  END IF;
END $$;

-- 2) Receitas: código de validação, hash e assinatura do técnico
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS validation_code text,
  ADD COLUMN IF NOT EXISTS doc_hash text,
  ADD COLUMN IF NOT EXISTS tecnico_name text,
  ADD COLUMN IF NOT EXISTS tecnico_signature text;

CREATE UNIQUE INDEX IF NOT EXISTS prescriptions_validation_code_key
  ON public.prescriptions (validation_code) WHERE validation_code IS NOT NULL;

-- 3) Consulta pública de validação (sem dados clínicos)
CREATE OR REPLACE FUNCTION public.validate_prescription(_codigo text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'found', true,
    'codigo', p.validation_code,
    'tipo', p.tipo,
    'emitida_em', p.created_at,
    'profissional', COALESCE(p.professional_name, p.created_by_name),
    'tecnico', p.tecnico_name,
    'paciente', CASE
      WHEN pa.nome IS NULL THEN NULL
      ELSE left(pa.nome, 1) || repeat('*', greatest(length(pa.nome) - 2, 1)) || right(pa.nome, 1)
    END,
    'hash', p.doc_hash,
    'situacao', 'valida'
  )
  FROM public.prescriptions p
  LEFT JOIN public.patients pa ON pa.id = p.patient_id
  WHERE p.validation_code = _codigo
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.validate_prescription(text) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_prescription(text) TO anon, authenticated;