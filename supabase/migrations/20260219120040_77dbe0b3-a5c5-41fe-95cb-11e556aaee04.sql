-- Allow admins to delete purchase orders
CREATE POLICY "Company admins can delete orders"
ON public.purchase_orders
FOR DELETE
USING (is_company_admin(auth.uid(), company_id));

-- Allow admins to delete purchase order items
CREATE POLICY "Company admins can delete order items"
ON public.purchase_order_items
FOR DELETE
USING (is_company_admin(auth.uid(), company_id));

-- Allow admins to update purchase order items
CREATE POLICY "Company admins can update order items"
ON public.purchase_order_items
FOR UPDATE
USING (is_company_admin(auth.uid(), company_id));