
-- Add pdf_url column to purchase_orders
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Create storage bucket for OC PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('oc-pdfs', 'oc-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: only company members can read their OC PDFs
CREATE POLICY "Company members can download OC PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'oc-pdfs'
  AND auth.uid() IS NOT NULL
);

-- Only admins can upload OC PDFs (via edge function with service role, but also allow direct)
CREATE POLICY "Admins can upload OC PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'oc-pdfs'
  AND auth.uid() IS NOT NULL
);

-- Allow deletion by admins
CREATE POLICY "Admins can delete OC PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'oc-pdfs'
  AND auth.uid() IS NOT NULL
);
