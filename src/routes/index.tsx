import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultContent,
  defaultSettings,
  fallbackPhotos,
  mergeContent,
  textValue,
  type ContentMap,
  type Photo,
  type SiteContentRow,
  type SiteSettings,
} from "@/lib/site-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: defaultSettings.seoTitle },
      { name: "description", content: defaultSettings.seoDescription },
      { property: "og:title", content: defaultSettings.seoTitle },
      { property: "og:description", content: defaultSettings.seoDescription },
      { property: "og:image", content: defaultSettings.socialImage },
      { name: "twitter:image", content: defaultSettings.socialImage },
    ],
  }),
  component: Index,
});

type StatItem = {
  n: string;
  label: string;
};

function safeHref(value: string | undefined, fallback = "#") {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:"
      ? url.toString()
      : fallback;
  } catch {
    return fallback;
  }
}

function safeImageSrc(value: string | null | undefined, fallback = "") {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("/") || trimmed.startsWith("./")) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function safeMailto(email: string) {
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? `mailto:${trimmed}` : undefined;
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

async function fetchSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("settings")
    .eq("key", "global")
    .maybeSingle();
  if (error) throw error;
  return { ...defaultSettings, ...((data?.settings as Partial<SiteSettings>) ?? {}) };
}

function Index() {
  const { data: galleryData } = useQuery({
    queryKey: ["public-photos"],
    queryFn: fetchGallery,
    retry: false,
  });
  const { data: content = defaultContent } = useQuery({
    queryKey: ["site-content"],
    queryFn: fetchSiteContent,
    retry: false,
  });
  const { data: settings = defaultSettings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: fetchSettings,
    retry: false,
  });
  const photos = galleryData && galleryData.length > 0 ? galleryData : fallbackPhotos;

  return (
    <div
      className={`site-shell theme-${settings.theme} bg-${settings.backgroundStyle} min-h-screen text-ink font-body`}
    >
      <Header footer={content.footer} />
      <Hero heroContent={content.hero} photos={photos} settings={settings} />
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
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "bg-paper/88 backdrop-blur border-b border-rule" : "bg-transparent"}`}
    >
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 h-16 flex items-center justify-between">
        <a href="#top" className="font-display text-xl">
          {textValue(footer, "brand_name", defaultContent.footer.content.brand_name)}
        </a>
        <nav className="hidden md:flex items-center gap-9 text-[0.76rem] tracking-[0.22em] uppercase text-ink-soft">
          <a href="#work" className="hover:text-ink transition-colors">
            Work
          </a>
          <a href="#about" className="hover:text-ink transition-colors">
            About
          </a>
          <a href="#contact" className="hover:text-ink transition-colors">
            Contact
          </a>
        </nav>
        <a
          href="#contact"
          className="hidden md:inline-flex items-center text-[0.76rem] tracking-[0.22em] uppercase border-b border-ink pb-0.5 hover:opacity-70 transition"
        >
          {textValue(footer, "cta_text", defaultContent.footer.content.cta_text)}
        </a>
      </div>
    </header>
  );
}

function Hero({
  heroContent,
  photos,
  settings,
}: {
  heroContent: SiteContentRow;
  photos: Photo[];
  settings: SiteSettings;
}) {
  return (
    <section id="top" className="relative min-h-screen overflow-hidden">
      <img
        src={safeImageSrc(heroContent.image_url, defaultContent.hero.image_url || "")}
        alt={textValue(heroContent, "image_alt", defaultContent.hero.content.image_alt)}
        className="absolute inset-0 h-full w-full object-cover opacity-22"
      />
      <div className="absolute inset-0 hero-wash" />
      <PhotoOrbit photos={photos} settings={settings} />

      <div className="relative z-10 mx-auto max-w-[1440px] min-h-screen px-5 md:px-10 pt-36 md:pt-44 pb-16 flex flex-col justify-between">
        <div className="max-w-5xl animate-rise">
          <p className="eyebrow mb-6">
            {textValue(heroContent, "eyebrow", defaultContent.hero.content.eyebrow)}
          </p>
          <h1 className="font-display text-6xl sm:text-7xl md:text-9xl leading-none">
            {textValue(heroContent, "title", defaultContent.hero.content.title)}
            <br />
            <em className="italic text-ink-soft">
              {textValue(heroContent, "italic_title", defaultContent.hero.content.italic_title)}
            </em>
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-10 md:items-end">
          <p className="max-w-xl text-base md:text-lg leading-relaxed text-ink-soft">
            {textValue(heroContent, "description", defaultContent.hero.content.description)}
          </p>
          <a
            href={safeHref(
              textValue(heroContent, "cta_link", defaultContent.hero.content.cta_link),
            )}
            className="hero-button"
            style={{ borderColor: settings.accent }}
          >
            {textValue(heroContent, "cta_text", defaultContent.hero.content.cta_text)}
          </a>
        </div>
      </div>
    </section>
  );
}

function PhotoOrbit({ photos, settings }: { photos: Photo[]; settings: SiteSettings }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    if (!mountRef.current || reducedMotion) return;
    const mount = mountRef.current;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    import("three").then((THREE) => {
      if (disposed || !mount.isConnected) return;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        42,
        mount.clientWidth / mount.clientHeight,
        0.1,
        100,
      );
      camera.position.set(0, 0, 8);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: window.devicePixelRatio <= 1.5,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      mount.appendChild(renderer.domElement);

      const group = new THREE.Group();
      scene.add(group);
      const loader = new THREE.TextureLoader();
      const selected = photos.filter((_, index) => index !== 5).slice(0, 6);
      selected.forEach((photo, index) => {
        const texture = loader.load(safeImageSrc(photo.src, photo.src));
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.9,
        });
        const geometry = new THREE.PlaneGeometry(1.45, 1.9);
        const mesh = new THREE.Mesh(geometry, material);
        const angle = (index / selected.length) * Math.PI * 2;
        const radius = index % 2 === 0 ? 2.8 : 3.6;
        mesh.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle * 1.4) * 1.2,
          Math.sin(angle) * 1.15,
        );
        mesh.rotation.set(0.08 * Math.sin(angle), -angle * 0.18, 0.05 * Math.cos(angle));
        group.add(mesh);
      });

      const speed =
        settings.animationIntensity === "cinematic"
          ? 0.0023
          : settings.animationIntensity === "calm"
            ? 0.0009
            : 0.0015;
      const pointer = { x: 0, y: 0 };
      const onPointer = (event: PointerEvent) => {
        pointer.x = (event.clientX / window.innerWidth - 0.5) * 0.55;
        pointer.y = (event.clientY / window.innerHeight - 0.5) * 0.35;
      };
      window.addEventListener("pointermove", onPointer, { passive: true });

      let frame = 0;
      const animate = () => {
        group.rotation.y += speed;
        group.rotation.x += (pointer.y - group.rotation.x) * 0.025;
        camera.position.x += (pointer.x - camera.position.x) * 0.025;
        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);
      };
      animate();

      const resize = () => {
        if (!mount.clientWidth || !mount.clientHeight) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      };
      window.addEventListener("resize", resize);

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("resize", resize);
        renderer.dispose();
        group.traverse((object) => {
          if ("isMesh" in object && object.isMesh) {
            const mesh = object as {
              geometry: { dispose: () => void };
              material: { map?: { dispose: () => void }; dispose: () => void };
            };
            mesh.geometry.dispose();
            mesh.material.map?.dispose();
            mesh.material.dispose();
          }
        });
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };

      if (disposed) cleanup();
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [photos, reducedMotion, settings.animationIntensity]);

  if (reducedMotion) {
    return (
      <div className="absolute right-4 top-28 bottom-16 hidden md:grid w-[42vw] grid-cols-2 gap-4 opacity-80">
        {photos.slice(0, 4).map((photo) => (
          <img
            key={photo.src}
            src={safeImageSrc(photo.src, photo.src)}
            alt={photo.alt}
            className="h-full w-full object-cover"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="absolute right-0 top-32 bottom-8 w-[82vw] md:w-[34vw] opacity-78"
      aria-hidden="true"
    />
  );
}

function Work({ photos, workContent }: { photos: Photo[]; workContent: SiteContentRow }) {
  const cols: Photo[][] = [[], [], []];
  photos.forEach((p, i) => cols[i % 3].push(p));

  return (
    <section id="work" className="relative bg-paper py-24 md:py-32">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-8 md:items-end mb-16">
          <div>
            <p className="eyebrow mb-4">
              {textValue(workContent, "eyebrow", defaultContent.work.content.eyebrow)}
            </p>
            <h2 className="font-display text-5xl md:text-7xl leading-none">
              {textValue(workContent, "title", defaultContent.work.content.title)}
              <br />
              <em className="italic text-ink-soft">
                {textValue(workContent, "italic_title", defaultContent.work.content.italic_title)}
              </em>
            </h2>
          </div>
          <p className="text-sm md:text-base text-ink-soft leading-relaxed">
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
          src={safeImageSrc(photo.src, photo.src)}
          alt={photo.alt}
          width={photo.w}
          height={photo.h}
          loading="lazy"
          className="w-full h-auto block transition-transform duration-700 ease-out group-hover:scale-[1.025]"
        />
      </div>
      <figcaption className="mt-4 flex items-baseline justify-between gap-4">
        <div>
          <p className="font-display italic text-xl text-ink">{photo.title}</p>
          {photo.place && <p className="eyebrow mt-1">{photo.place}</p>}
          {photo.caption && (
            <p className="text-sm text-ink-soft leading-relaxed mt-2 max-w-sm">{photo.caption}</p>
          )}
        </div>
        <p className="text-xs text-ink-soft tabular-nums">
          No. {String(index + 1).padStart(2, "0")}
          {photo.year ? ` | ${photo.year}` : ""}
        </p>
      </figcaption>
    </figure>
  );
}

function About({ aboutContent }: { aboutContent: SiteContentRow }) {
  return (
    <section id="about" className="relative bg-paper py-24 md:py-32 border-t border-rule">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 items-start">
        <div className="md:col-span-5">
          <img
            src={safeImageSrc(aboutContent.image_url, defaultContent.about.image_url || "")}
            alt={textValue(aboutContent, "image_alt", defaultContent.about.content.image_alt)}
            width={960}
            height={1280}
            loading="lazy"
            className="w-full h-auto"
          />
        </div>
        <div className="md:col-span-7 md:pt-8">
          <p className="eyebrow mb-6">
            {textValue(aboutContent, "eyebrow", defaultContent.about.content.eyebrow)}
          </p>
          <h2 className="font-display text-4xl md:text-6xl leading-none mb-10">
            {textValue(aboutContent, "title", defaultContent.about.content.title)}
            <br />
            <em className="italic text-ink-soft">
              {textValue(aboutContent, "italic_title", defaultContent.about.content.italic_title)}
            </em>
          </h2>
          <div className="space-y-6 text-base md:text-lg leading-relaxed text-ink-soft max-w-2xl">
            <p>
              {textValue(aboutContent, "paragraph_1", defaultContent.about.content.paragraph_1)}
            </p>
            <p>
              {textValue(aboutContent, "paragraph_2", defaultContent.about.content.paragraph_2)}
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-8 max-w-lg">
            {statsValue(aboutContent).map((stat, index) => (
              <Stat key={`${stat.n}-${stat.label}-${index}`} n={stat.n} label={stat.label} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
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
  const instagramLink = textValue(
    contactContent,
    "instagram_link",
    defaultContent.contact.content.instagram_link,
  );

  return (
    <section id="contact" className="relative bg-ink text-paper py-24 md:py-32">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <p className="eyebrow mb-6 text-paper/60">
          {textValue(contactContent, "eyebrow", defaultContent.contact.content.eyebrow)}
        </p>
        <h2 className="font-display text-5xl md:text-8xl leading-none max-w-4xl">
          {textValue(contactContent, "title", defaultContent.contact.content.title)}
          <br />
          <em className="italic text-paper/55">
            {textValue(contactContent, "italic_title", defaultContent.contact.content.italic_title)}
          </em>
        </h2>
        <p className="mt-8 max-w-2xl text-paper/70 leading-relaxed">
          {textValue(contactContent, "description", defaultContent.contact.content.description)}
        </p>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          <ContactBlock
            label={textValue(
              contactContent,
              "email_label",
              defaultContent.contact.content.email_label,
            )}
            value={email}
            href={safeMailto(email)}
          />
          <ContactBlock
            label={textValue(
              contactContent,
              "instagram_label",
              defaultContent.contact.content.instagram_label,
            )}
            value={textValue(contactContent, "instagram", defaultContent.contact.content.instagram)}
            href={safeHref(instagramLink, "")}
          />
        </div>
      </div>
    </section>
  );
}

function ContactBlock({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <>
      <p className="eyebrow mb-3 text-paper/60">{label}</p>
      <p className="font-display text-2xl md:text-3xl">{value}</p>
    </>
  );
  return (
    <div className="border-t border-paper/20 pt-6">
      {href ? (
        <a href={href} className="block hover:opacity-70 transition">
          {inner}
        </a>
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
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t border-paper/20">
        <p className="font-display text-lg">
          {textValue(footerContent, "brand_name", defaultContent.footer.content.brand_name)}
        </p>
        <p className="text-xs tracking-[0.22em] uppercase text-paper/55">
          {year}{" "}
          {textValue(footerContent, "copyright_text", defaultContent.footer.content.copyright_text)}
        </p>
        <p className="max-w-sm text-xs tracking-[0.18em] uppercase text-paper/55">
          {textValue(
            footerContent,
            "protection_text",
            defaultContent.footer.content.protection_text,
          )}
        </p>
      </div>
    </footer>
  );
}
