
-- Create ribs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ribs', 'ribs', false)
ON CONFLICT (id) DO NOTHING;

-- Users can upload to their own folder
CREATE POLICY "Users upload own RIB"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ribs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can update their own RIB
CREATE POLICY "Users update own RIB"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ribs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can read their own RIB
CREATE POLICY "Users read own RIB"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ribs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- CEO can read all RIBs
CREATE POLICY "CEO reads all RIBs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ribs' AND EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'
));
