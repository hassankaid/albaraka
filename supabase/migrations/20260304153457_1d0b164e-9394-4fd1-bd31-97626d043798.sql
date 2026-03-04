
-- Create invoices storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for invoices bucket
CREATE POLICY "CEO can manage invoices files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'invoices' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ceo')
WITH CHECK (bucket_id = 'invoices' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ceo');

CREATE POLICY "Apporteurs can read own invoice files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
