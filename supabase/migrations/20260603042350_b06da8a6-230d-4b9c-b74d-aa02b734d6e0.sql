
-- Add profile extension columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_role text,
  ADD COLUMN IF NOT EXISTS key_project_summary text,
  ADD COLUMN IF NOT EXISTS cover_letter_recipient text;

-- Storage policies for avatars bucket (private bucket, public read so URLs work everywhere)
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
