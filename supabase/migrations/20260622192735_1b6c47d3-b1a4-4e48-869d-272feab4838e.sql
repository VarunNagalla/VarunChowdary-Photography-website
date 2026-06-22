
CREATE POLICY "Admins can upload photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'photos' AND public.has_role(auth.uid(), 'admin'));
