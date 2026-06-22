-- CMS content for the photography website.
-- This migration makes all major homepage sections editable from /admin.

-- Keep the private photos bucket available for gallery and section images.
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', false)
ON CONFLICT (id) DO NOTHING;

-- Gallery improvements.
ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS caption TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

-- Public visitors should only see published photos. Admins can still see everything.
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

-- Starter rows that match the original design. Admin can edit these from /admin.
INSERT INTO public.site_content (section_key, content)
VALUES
  ('hero', '{
    "eyebrow": "Photographer · est. 2016",
    "title": "Quiet light,",
    "italic_title": "honest frames.",
    "description": "A continuing study of people, places, and the in-between moments — collected on film and digital across four continents.",
    "cta_text": "View Selected Work",
    "cta_link": "#work",
    "image_alt": "Foggy forest"
  }'::jsonb),
  ('work', '{
    "eyebrow": "Selected · ongoing",
    "title": "A small archive,",
    "italic_title": "carefully chosen.",
    "description": "Frames from a larger ongoing body of work. Full series available on request."
  }'::jsonb),
  ('about', '{
    "eyebrow": "About — Varun Nagalla",
    "title": "I make pictures",
    "italic_title": "that feel like memory.",
    "paragraph_1": "I''m a photographer based between Hyderabad and Lisbon, working with editorial clients, couples, and brands who care about the slow, the unhurried, the slightly imperfect.",
    "paragraph_2": "My work has appeared in independent magazines and gallery group shows across Europe and Asia. I shoot mostly with a 35mm prime and natural light, and I print everything I love.",
    "image_alt": "Portrait of Varun Nagalla",
    "stats": [
      {"n": "08+", "label": "Years working"},
      {"n": "140", "label": "Stories told"},
      {"n": "22", "label": "Countries"},
      {"n": "04", "label": "Print editions"}
    ]
  }'::jsonb),
  ('contact', '{
    "eyebrow": "Commissions & prints",
    "title": "Have a story",
    "italic_title": "worth photographing?",
    "email_label": "Write",
    "email": "hello@varunnagalla.com",
    "instagram_label": "Instagram",
    "instagram": "@varun.frames",
    "instagram_link": "https://instagram.com",
    "studio_label": "Studio",
    "studio": "Lisbon · Hyderabad"
  }'::jsonb),
  ('footer', '{
    "brand_name": "Varun Nagalla",
    "commission_text": "Commission",
    "copyright_text": "Varun Nagalla. All rights reserved.",
    "protection_text": "All images protected by copyright."
  }'::jsonb)
ON CONFLICT (section_key) DO NOTHING;
