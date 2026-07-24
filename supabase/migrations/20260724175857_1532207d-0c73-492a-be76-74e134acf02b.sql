ALTER TABLE public.material_dispensations
  DROP CONSTRAINT IF EXISTS material_dispensations_patient_consumption_fkey;

ALTER TABLE public.material_dispensations
  ADD CONSTRAINT material_dispensations_patient_consumption_fkey
  FOREIGN KEY (patient_consumption_id)
  REFERENCES public.patient_consumptions(id)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;