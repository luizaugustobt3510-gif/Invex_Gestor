ALTER TABLE public.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_patient_consumption_id_fkey;

ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_patient_consumption_id_fkey
  FOREIGN KEY (patient_consumption_id)
  REFERENCES public.patient_consumptions(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;