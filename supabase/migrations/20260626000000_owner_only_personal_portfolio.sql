-- Owner-only CMS and personal portfolio starter data.

CREATE OR REPLACE FUNCTION public.is_site_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'varunchowdary3345@gmail.com';
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Owner can insert site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Owner can update site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Owner can delete site settings" ON public.site_settings;

CREATE POLICY "Anyone can view site settings"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Owner can insert site settings"
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_site_admin());

CREATE POLICY "Owner can update site settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

CREATE POLICY "Owner can delete site settings"
  ON public.site_settings FOR DELETE
  TO authenticated
  USING (public.is_site_admin());

DROP TRIGGER IF EXISTS site_settings_set_updated_at ON public.site_settings;
CREATE TRIGGER site_settings_set_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Make existing tables owner-only for edits. Public visitors can still read published content.
DROP POLICY IF EXISTS "Admins can insert photos" ON public.photos;
DROP POLICY IF EXISTS "Admins can update photos" ON public.photos;
DROP POLICY IF EXISTS "Admins can delete photos" ON public.photos;
DROP POLICY IF EXISTS "Admins can view all photos" ON public.photos;

CREATE POLICY "Owner can view all photos"
  ON public.photos FOR SELECT
  TO authenticated
  USING (public.is_site_admin());

CREATE POLICY "Owner can insert photos"
  ON public.photos FOR INSERT
  TO authenticated
  WITH CHECK (public.is_site_admin());

CREATE POLICY "Owner can update photos"
  ON public.photos FOR UPDATE
  TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

CREATE POLICY "Owner can delete photos"
  ON public.photos FOR DELETE
  TO authenticated
  USING (public.is_site_admin());

DROP POLICY IF EXISTS "Admins can insert site content" ON public.site_content;
DROP POLICY IF EXISTS "Admins can update site content" ON public.site_content;
DROP POLICY IF EXISTS "Admins can delete site content" ON public.site_content;

CREATE POLICY "Owner can insert site content"
  ON public.site_content FOR INSERT
  TO authenticated
  WITH CHECK (public.is_site_admin());

CREATE POLICY "Owner can update site content"
  ON public.site_content FOR UPDATE
  TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

CREATE POLICY "Owner can delete site content"
  ON public.site_content FOR DELETE
  TO authenticated
  USING (public.is_site_admin());

DROP POLICY IF EXISTS "Admins can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read photos" ON storage.objects;

CREATE POLICY "Owner can upload photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'photos' AND public.is_site_admin());

CREATE POLICY "Owner can update photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'photos' AND public.is_site_admin())
  WITH CHECK (bucket_id = 'photos' AND public.is_site_admin());

CREATE POLICY "Owner can delete photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'photos' AND public.is_site_admin());

CREATE POLICY "Owner can read photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'photos' AND public.is_site_admin());

INSERT INTO public.site_settings (key, settings)
VALUES (
  'global',
  '{
    "theme": "warm",
    "accent": "#9b6a45",
    "animationIntensity": "balanced",
    "backgroundStyle": "soft",
    "seoTitle": "VC Photography | Personal Photography Portfolio",
    "seoDescription": "A personal photography portfolio by Varun, sharing moments, places, light, and small details captured through his lens.",
    "socialImage": ""
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET settings = EXCLUDED.settings;

INSERT INTO public.site_content (section_key, content)
VALUES
  ('hero', '{
    "eyebrow": "Personal photography portfolio",
    "title": "Moments I captured,",
    "italic_title": "the way I saw them.",
    "description": "This is a personal collection of photos I''ve taken through my lens. Each image is a moment, place, or detail I wanted to remember and share.",
    "cta_text": "View My Work",
    "cta_link": "#work",
    "image_alt": "A photograph captured by Varun"
  }'::jsonb),
  ('work', '{
    "eyebrow": "Favorite frames",
    "title": "Photos I captured",
    "italic_title": "because they stayed with me.",
    "description": "These are some of my favorite frames, chosen for their mood, light, place, detail, and the memory behind each picture."
  }'::jsonb),
  ('about', '{
    "eyebrow": "About Varun",
    "title": "I see the world",
    "italic_title": "through a camera.",
    "paragraph_1": "I''m Varun, a passionate photographer who enjoys capturing moments, places, people, light, and small details that usually go unnoticed. Photography is something I do because I genuinely love seeing the world through a camera.",
    "paragraph_2": "This website is a personal space for the images I''ve taken. Every photo here is part of my journey, my perspective, and the way I choose to remember a moment.",
    "image_alt": "Portrait for VC Photography",
    "stats": [
      {"n": "01", "label": "Personal collection"},
      {"n": "08", "label": "Favorite frames"},
      {"n": "100%", "label": "Captured by me"},
      {"n": "VC", "label": "Photography"}
    ]
  }'::jsonb),
  ('contact', '{
    "eyebrow": "Connect",
    "title": "Like my photos?",
    "italic_title": "Let''s connect.",
    "description": "I''m always learning, exploring, and capturing new moments. If you like my work or want to connect about photography, feel free to reach out.",
    "email_label": "Email",
    "email": "varunchowdary3345@gmail.com",
    "instagram_label": "Instagram",
    "instagram": "@vc.photography",
    "instagram_link": "https://instagram.com",
    "studio_label": "Location",
    "studio": "Personal portfolio"
  }'::jsonb),
  ('footer', '{
    "brand_name": "VC Photography",
    "cta_text": "Connect",
    "copyright_text": "VC Photography. All rights reserved.",
    "protection_text": "All photos shown here are captured and shared as part of my personal photography portfolio."
  }'::jsonb)
ON CONFLICT (section_key) DO UPDATE SET content = EXCLUDED.content;
