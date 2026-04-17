
-- Allow usuario_almox to delete materials (matches insert/update policies)
DROP POLICY IF EXISTS "Company logistics can delete materials" ON public.materials;

CREATE POLICY "Company logistics can delete materials"
  ON public.materials FOR DELETE
  TO authenticated
  USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'usuario_almox'::app_role))
  );

-- Ensure FK references to materials cascade on delete (avoids "update or delete on table violates foreign key" errors)
ALTER TABLE public.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_material_id_fkey,
  ADD CONSTRAINT stock_movements_material_id_fkey
    FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;

ALTER TABLE public.conciliacao_log
  DROP CONSTRAINT IF EXISTS conciliacao_log_material_id_fkey,
  ADD CONSTRAINT conciliacao_log_material_id_fkey
    FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;

ALTER TABLE public.contagem_fisica
  DROP CONSTRAINT IF EXISTS contagem_fisica_material_id_fkey,
  ADD CONSTRAINT contagem_fisica_material_id_fkey
    FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;

ALTER TABLE public.movimentacoes_importadas
  DROP CONSTRAINT IF EXISTS movimentacoes_importadas_material_id_fkey,
  ADD CONSTRAINT movimentacoes_importadas_material_id_fkey
    FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;

ALTER TABLE public.saldo_sistema_importado
  DROP CONSTRAINT IF EXISTS saldo_sistema_importado_material_id_fkey,
  ADD CONSTRAINT saldo_sistema_importado_material_id_fkey
    FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;

ALTER TABLE public.sale_items
  DROP CONSTRAINT IF EXISTS sale_items_material_id_fkey,
  ADD CONSTRAINT sale_items_material_id_fkey
    FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;
