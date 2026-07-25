
-- 1. FK deferrable so BEFORE INSERT trigger can create child row referencing parent
ALTER TABLE public.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_patient_consumption_fkey;

ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_patient_consumption_fkey
  FOREIGN KEY (patient_consumption_id)
  REFERENCES public.patient_consumptions(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- 2. Group id for material requests (batch = one order)
ALTER TABLE public.material_requests
  ADD COLUMN IF NOT EXISTS request_group_id uuid;

CREATE INDEX IF NOT EXISTS idx_material_requests_group
  ON public.material_requests(request_group_id);
