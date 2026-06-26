-- Gallery improvements.
ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS caption TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Anyone can view photos" ON public.photos;
DROP POLICY IF EXISTS "Anyone can view published photos" ON public.photos;
DROP POLICY IF EXISTS "Admins can view all photos" ON public.photos;

CREATE POLICY "Anyone can view published photos"
  ON public.photos FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "Admins can view all photos"
  ON public.photos FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Main editable website content.
CREATE TABLE IF NOT EXISTS public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view site content" ON public.site_content;
DROP POLICY IF EXISTS "Admins can insert site content" ON public.site_content;
DROP POLICY IF EXISTS "Admins can update site content" ON public.site_content;
DROP POLICY IF EXISTS "Admins can delete site content" ON public.site_content;

CREATE POLICY "Anyone can view site content"
  ON public.site_content FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert site content"
  ON public.site_content FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update site content"
  ON public.site_content FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete site content"
  ON public.site_content FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS site_content_set_updated_at ON public.site_content;
CREATE TRIGGER site_content_set_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed starter rows.
INSERT INTO public.site_content (section_key, content)
VALUES
  ('hero', '{
    "eyebrow": "Personal photography portfolio",
    "title": "Moments I captured,",
    "italic_title": "the way I saw them.",
    "description": "This is a personal collection of photos I''ve taken through my lens. Each image is a moment, place, or detail I wanted to remember and share.",
    "cta_text": "View My Work",
    "cta_link": "#work",
    "image_alt": "Foggy forest"
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
      {"n": "08+", "label": "Years working"},
      {"n": "140", "label": "Stories told"},
      {"n": "100%", "label": "Captured by me"},
      {"n": "VC", "label": "Photography"}
    ]
  }'::jsonb),
  ('contact', '{
    "eyebrow": "Connect",
    "title": "Like my photos?",
    "italic_title": "Let''s connect.",
    "email_label": "Write",
    "email": "varunchowdary3345@gmail.com",
    "instagram_label": "Instagram",
    "instagram": "@vc.photography",
    "instagram_link": "https://instagram.com",
    "Location_label": "Location",
    "studio": "Personal portfolio"
  }'::jsonb),
  ('footer', '{
    "brand_name": "VC Photography",
    "Connect_text": "Connect",
    "copyright_text": "VC Photography. All rights reserved.",
    "protection_text": "All photos shown here are captured and shared as part of my personal photography portfolio."
  }'::jsonb)
ON CONFLICT (section_key) DO NOTHING;
