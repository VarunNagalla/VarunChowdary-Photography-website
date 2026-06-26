import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import hero from "@/assets/hero.jpg";
import portrait from "@/assets/portrait.jpg";
import photo1 from "@/assets/photo-1.jpg";
import photo2 from "@/assets/photo-2.jpg";
import photo3 from "@/assets/photo-3.jpg";
import photo4 from "@/assets/photo-4.jpg";
import photo5 from "@/assets/photo-5.jpg";
import photo6 from "@/assets/photo-6.jpg";
import photo7 from "@/assets/photo-7.jpg";
import photo8 from "@/assets/photo-8.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Varun Nagalla — Photography" },
      { name: "description", content: "Portraits, landscapes and editorial photography by Varun Nagalla." },
      { property: "og:title", content: "Varun Nagalla — Photography" },
      { property: "og:description", content: "Portraits, landscapes and editorial photography." },
      { property: "og:image", content: hero },
      { name: "twitter:image", content: hero },
    ],
  }),
  component: Index,
});

type Photo = {
  src: string;
  alt: string;
  title: string;
  place: string;
  year: string;
  caption: string;
  w: number;
  h: number;
};

type SiteContentRow = {
  section_key: string;
  content: Record<string, unknown>;
  image_url: string | null;
  storage_path: string | null;
};

type ContentMap = Record<string, SiteContentRow>;

type StatItem = {
  n: string;
  label: string;
};

const fallbackPhotos: Photo[] = [
  { src: photo1, alt: "Portrait in window light", title: "In Half-Light", place: "Lisbon", year: "2024", caption: "", w: 1024, h: 1024 },
  { src: photo2, alt: "Misty mountains at dawn", title: "Morning, Untitled", place: "Dolomites", year: "2023", caption: "", w: 1280, h: 896 },
  { src: photo3, alt: "Brutalist architecture", title: "Concrete & Sun", place: "São Paulo", year: "2024", caption: "", w: 960, h: 1280 },
  { src: photo4, alt: "Tokyo alleyway at night", title: "Shinjuku, 2 a.m.", place: "Tokyo", year: "2023", caption: "", w: 1024, h: 1024 },
  { src: photo5, alt: "Macro of dewdrops on a leaf", title: "Small Worlds", place: "Kyoto", year: "2022", caption: "", w: 1280, h: 960 },
  { src: photo6, alt: "Bride laughing in golden hour", title: "The First Look", place: "Provence", year: "2024", caption: "", w: 960, h: 1280 },
  { src: photo7, alt: "Desert dunes at sunset", title: "Long Light", place: "Wahiba Sands", year: "2023", caption: "", w: 1280, h: 854 },
  { src: photo8, alt: "Hands of a craftsman", title: "Hands That Remember", place: "Florence", year: "2022", caption: "", w: 1024, h: 1024 },
];

const defaultContent = {
  hero: {
    section_key: "hero",
    image_url: hero,
    storage_path: null,
    content: {
      eyebrow: "Photographer · est. 2016",
      title: "Quiet light,",
      italic_title: "honest frames.",
      description: "A continuing study of people, places, and the in-between moments — collected on film and digital across four continents.",
      cta_text: "View Selected Work",
      cta_link: "#work",
      image_alt: "Foggy forest",
    },
  },
  work: {
    section_key: "work",
    image_url: null,
    storage_path: null,
    content: {
      eyebrow: "Selected · ongoing",
      title: "A small archive,",
      italic_title: "carefully chosen.",
      description: "Frames from a larger ongoing body of work. Full series available on request.",
    },
  },
  about: {
    section_key: "about",
    image_url: portrait,
    storage_path: null,
    content: {
      eyebrow: "About — Varun Nagalla",
      title: "I make pictures",
      italic_title: "that feel like memory.",
      paragraph_1: "I'm a photographer based between Hyderabad and Lisbon, working with editorial clients, couples, and brands who care about the slow, the unhurried, the slightly imperfect.",
      paragraph_2: "My work has appeared in independent magazines and gallery group shows across Europe and Asia. I shoot mostly with a 35mm prime and natural light, and I print everything I love.",
      image_alt: "Portrait of Varun Nagalla",
      stats: [
        { n: "08+", label: "Years working" },
        { n: "140", label: "Stories told" },
        { n: "22", label: "Countries" },
        { n: "04", label: "Print editions" },
      ],
    },
  },
  contact: {
    section_key: "contact",
    image_url: null,
    storage_path: null,
    content: {
      eyebrow: "Commissions & prints",
      title: "Have a story",
      italic_title: "worth photographing?",
      email_label: "Write",
      email: "hello@varunnagalla.com",
      instagram_label: "Instagram",
      instagram: "@varun.frames",
      instagram_link: "https://instagram.com",
      studio_label: "Studio",
      studio: "Lisbon · Hyderabad",
    },
  },
  footer: {
    section_key: "footer",
    image_url: null,
    storage_path: null,
    content: {
      brand_name: "Varun Nagalla",
      copyright_text: "Varun Nagalla. All rights reserved.",
      protection_text: "All images protected by copyright.",
      commission_text: "Commission",
    },
  },
} satisfies ContentMap;

function textValue(row: SiteContentRow | undefined, key: string, fallback: string) {
  const value = row?.content?.[key];
  return typeof value === "string" ? value : fallback;
}

function statsValue(row: SiteContentRow | undefined): StatItem[] {
  const value = row?.content?.stats;
  if (!Array.isArray(value)) return defaultContent.about.content.stats;
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const stat = item as Record<string, unknown>;
      return {
        n: typeof stat.n === "string" ? stat.n : "",
        label: typeof stat.label === "string" ? stat.label : "",
      };
    })
    .filter((item): item is StatItem => !!item && (!!item.n || !!item.label));
}

function mergeContent(rows: SiteContentRow[]): ContentMap {
  return rows.reduce<ContentMap>((acc, row) => {
    acc[row.section_key] = {
      ...defaultContent[row.section_key as keyof typeof defaultContent],
      ...row,
      content: {
        ...(defaultContent[row.section_key as keyof typeof defaultContent]?.content ?? {}),
        ...(row.content ?? {}),
      },
    };
    return acc;
  }, { ...defaultContent });
}

async function fetchSiteContent(): Promise<ContentMap> {
  const { data, error } = await supabase
    .from("site_content")
    .select("section_key, content, image_url, storage_path");

  if (error) throw error;
  return mergeContent((data ?? []) as SiteContentRow[]);
}

async function fetchGallery(): Promise<Photo[]> {
  const { data, error } = await supabase
    .from("photos")
    .select("title, place, year, caption, image_url, alt_text, width, height, is_published")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    src: p.image_url,
    alt: p.alt_text || p.title,
    title: p.title,
    place: p.place,
    year: p.year,
    caption: p.caption ?? "",
    w: p.width ?? 1200,
    h: p.height ?? 1200,
  }));
}

function Index() {
  const { data: galleryData } = useQuery({ queryKey: ["public-photos"], queryFn: fetchGallery });
  const { data: content = defaultContent } = useQuery({ queryKey: ["site-content"], queryFn: fetchSiteContent });
  const photos = galleryData && galleryData.length > 0 ? galleryData : fallbackPhotos;

  return (
    <div className="min-h-screen bg-paper text-ink font-body">
      <Header footer={content.footer} />
      <Hero heroContent={content.hero} />
      <Work photos={photos} workContent={content.work} />
      <About aboutContent={content.about} />
      <Contact contactContent={content.contact} />
      <Footer footerContent={content.footer} />
    </div>
  );
}

function Header({ footer }: { footer: SiteContentRow }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-paper/85 backdrop-blur border-b border-rule" : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 h-16 flex items-center justify-between">
        <a href="#top" className="font-display text-xl tracking-tight">
          {textValue(footer, "brand_name", defaultContent.footer.content.brand_name)}
        </a>
        <nav className="hidden md:flex items-center gap-10 text-[0.78rem] tracking-[0.22em] uppercase text-ink-soft">
          <a href="#work" className="hover:text-ink transition-colors">Work</a>
          <a href="#about" className="hover:text-ink transition-colors">About</a>
          <a href="#contact" className="hover:text-ink transition-colors">Contact</a>
        </nav>
        <a
          href="#contact"
          className="hidden md:inline-flex items-center text-[0.78rem] tracking-[0.22em] uppercase border-b border-ink pb-0.5 hover:opacity-70 transition"
        >
          {textValue(footer, "commission_text", defaultContent.footer.content.commission_text)}
        </a>
      </div>
    </header>
  );
}

function Hero({ heroContent }: { heroContent: SiteContentRow }) {
  const ctaLink = textValue(heroContent, "cta_link", defaultContent.hero.content.cta_link);

  return (
    <section id="top" className="relative min-h-screen flex flex-col">
      <img
        src={heroContent.image_url || hero}
        alt={textValue(heroContent, "image_alt", defaultContent.hero.content.image_alt)}
        width={1920}
        height={1280}
        className="absolute inset-0 w-full h-full object-cover opacity-90"
      />
      <div className="absolute inset-0 bg-paper/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-paper/40 via-transparent to-paper" />

      <div className="relative mx-auto max-w-[1400px] w-full px-6 md:px-10 pt-40 md:pt-56 pb-24 flex-1 flex flex-col justify-between">
        <div className="animate-rise">
          <p className="eyebrow mb-6">{textValue(heroContent, "eyebrow", defaultContent.hero.content.eyebrow)}</p>
          <h1 className="font-display text-[14vw] md:text-[10rem] leading-[0.92] tracking-[-0.03em]">
            {textValue(heroContent, "title", defaultContent.hero.content.title)}<br />
            <em className="italic text-ink-soft">{textValue(heroContent, "italic_title", defaultContent.hero.content.italic_title)}</em>
          </h1>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mt-16">
          <p className="max-w-md text-base md:text-lg leading-relaxed text-ink-soft">
            {textValue(heroContent, "description", defaultContent.hero.content.description)}
          </p>
          <div className="flex items-center gap-6 text-[0.78rem] tracking-[0.22em] uppercase">
            <a href={ctaLink} className="border-b border-ink pb-0.5 hover:opacity-70 transition">
              {textValue(heroContent, "cta_text", defaultContent.hero.content.cta_text)}
            </a>
            <span className="text-ink-soft">↓</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Work({ photos, workContent }: { photos: Photo[]; workContent: SiteContentRow }) {
  const cols: Photo[][] = [[], [], []];
  photos.forEach((p, i) => cols[i % 3].push(p));

  return (
    <section id="work" className="relative bg-paper py-24 md:py-36">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16 md:mb-24">
          <div>
            <p className="eyebrow mb-4">{textValue(workContent, "eyebrow", defaultContent.work.content.eyebrow)}</p>
            <h2 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight">
              {textValue(workContent, "title", defaultContent.work.content.title)}<br />
              <em className="italic text-ink-soft">{textValue(workContent, "italic_title", defaultContent.work.content.italic_title)}</em>
            </h2>
          </div>
          <p className="md:max-w-xs text-sm text-ink-soft leading-relaxed">
            {textValue(workContent, "description", defaultContent.work.content.description)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-6 md:gap-8">
              {col.map((p, pi) => (
                <PhotoCard key={`${ci}-${pi}-${p.title}`} photo={p} index={ci * 3 + pi} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PhotoCard({ photo, index }: { photo: Photo; index: number }) {
  return (
    <figure className="group">
      <div className="overflow-hidden bg-muted">
        <img
          src={photo.src}
          alt={photo.alt}
          width={photo.w}
          height={photo.h}
          loading="lazy"
          className="w-full h-auto block transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
        />
      </div>
      <figcaption className="mt-4 flex items-baseline justify-between gap-4">
        <div>
          <p className="font-display italic text-xl text-ink">{photo.title}</p>
          {photo.place && <p className="eyebrow mt-1">{photo.place}</p>}
          {photo.caption && <p className="text-sm text-ink-soft leading-relaxed mt-2 max-w-sm">{photo.caption}</p>}
        </div>
        <p className="text-xs text-ink-soft tabular-nums">
          № {String(index + 1).padStart(2, "0")}{photo.year ? ` · ${photo.year}` : ""}
        </p>
      </figcaption>
    </figure>
  );
}

function About({ aboutContent }: { aboutContent: SiteContentRow }) {
  return (
    <section id="about" className="relative bg-paper py-24 md:py-36 border-t border-rule">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 items-start">
        <div className="md:col-span-5">
          <img
            src={aboutContent.image_url || portrait}
            alt={textValue(aboutContent, "image_alt", defaultContent.about.content.image_alt)}
            width={960}
            height={1280}
            loading="lazy"
            className="w-full h-auto"
          />
        </div>
        <div className="md:col-span-7 md:pt-12">
          <p className="eyebrow mb-6">{textValue(aboutContent, "eyebrow", defaultContent.about.content.eyebrow)}</p>
          <h2 className="font-display text-4xl md:text-6xl leading-[1] tracking-tight mb-10">
            {textValue(aboutContent, "title", defaultContent.about.content.title)}<br />
            <em className="italic text-ink-soft">{textValue(aboutContent, "italic_title", defaultContent.about.content.italic_title)}</em>
          </h2>
          <div className="space-y-6 text-base md:text-lg leading-relaxed text-ink-soft max-w-xl">
            <p>{textValue(aboutContent, "paragraph_1", defaultContent.about.content.paragraph_1)}</p>
            <p>{textValue(aboutContent, "paragraph_2", defaultContent.about.content.paragraph_2)}</p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-8 max-w-md">
            {statsValue(aboutContent).map((stat, index) => (
              <Stat key={`${stat.n}-${stat.label}-${index}`} n={stat.n} label={stat.label} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="border-t border-rule pt-4">
      <p className="font-display text-4xl">{n}</p>
      <p className="eyebrow mt-2">{label}</p>
    </div>
  );
}

function Contact({ contactContent }: { contactContent: SiteContentRow }) {
  const email = textValue(contactContent, "email", defaultContent.contact.content.email);
  const instagramLink = textValue(contactContent, "instagram_link", defaultContent.contact.content.instagram_link);

  return (
    <section id="contact" className="relative bg-ink text-paper py-24 md:py-36">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <p className="eyebrow mb-6" style={{ color: "rgba(245,243,238,0.6)" }}>
          {textValue(contactContent, "eyebrow", defaultContent.contact.content.eyebrow)}
        </p>
        <h2 className="font-display text-5xl md:text-8xl leading-[0.95] tracking-tight max-w-4xl">
          {textValue(contactContent, "title", defaultContent.contact.content.title)}<br />
          <em className="italic" style={{ color: "rgba(245,243,238,0.55)" }}>
            {textValue(contactContent, "italic_title", defaultContent.contact.content.italic_title)}
          </em>
        </h2>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          <ContactBlock
            label={textValue(contactContent, "email_label", defaultContent.contact.content.email_label)}
            value={email}
            href={email ? `mailto:${email}` : undefined}
          />
          <ContactBlock
            label={textValue(contactContent, "instagram_label", defaultContent.contact.content.instagram_label)}
            value={textValue(contactContent, "instagram", defaultContent.contact.content.instagram)}
            href={instagramLink}
          />
        </div>
      </div>
    </section>
  );
}

function ContactBlock({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <>
      <p className="eyebrow mb-3" style={{ color: "rgba(245,243,238,0.6)" }}>{label}</p>
      <p className="font-display text-2xl md:text-3xl">{value}</p>
    </>
  );
  return (
    <div className="border-t pt-6" style={{ borderColor: "rgba(245,243,238,0.18)" }}>
      {href ? (
        <a href={href} className="block hover:opacity-70 transition">{inner}</a>
      ) : (
        inner
      )}
    </div>
  );
}

function Footer({ footerContent }: { footerContent: SiteContentRow }) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink text-paper">
      <div
        className="mx-auto max-w-[1400px] px-6 md:px-10 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t"
        style={{ borderColor: "rgba(245,243,238,0.18)" }}
      >
        <p className="font-display text-lg">{textValue(footerContent, "brand_name", defaultContent.footer.content.brand_name)}</p>
        <p className="text-xs tracking-[0.22em] uppercase" style={{ color: "rgba(245,243,238,0.55)" }}>
          © {year} {textValue(footerContent, "copyright_text", defaultContent.footer.content.copyright_text)}
        </p>
        <p className="text-xs tracking-[0.22em] uppercase" style={{ color: "rgba(245,243,238,0.55)" }}>
          {textValue(footerContent, "protection_text", defaultContent.footer.content.protection_text)}
        </p>
      </div>
    </footer>
  );
}
