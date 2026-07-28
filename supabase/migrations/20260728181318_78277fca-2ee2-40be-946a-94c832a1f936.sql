ALTER TABLE public.patient_consumptions DROP CONSTRAINT IF EXISTS patient_consumptions_patient_id_fkey;
ALTER TABLE public.patient_consumptions ADD CONSTRAINT patient_consumptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_patient_consumption_id_fkey;
ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_patient_consumption_id_fkey FOREIGN KEY (patient_consumption_id) REFERENCES public.patient_consumptions(id) ON DELETE SET NULL;

ALTER TABLE public.material_dispensations DROP CONSTRAINT IF EXISTS material_dispensations_patient_consumption_id_fkey;
ALTER TABLE public.material_dispensations ADD CONSTRAINT material_dispensations_patient_consumption_id_fkey FOREIGN KEY (patient_consumption_id) REFERENCES public.patient_consumptions(id) ON DELETE SET NULL;