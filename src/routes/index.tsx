import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// ── types ─────────────────────────────────────────────────────────────────────

type StatItem = { n: string; label: string };

// ── helpers ───────────────────────────────────────────────────────────────────

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

// ── data fetchers ─────────────────────────────────────────────────────────────

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

// ── scroll reveal hook ────────────────────────────────────────────────────────

function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.07 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ── root ──────────────────────────────────────────────────────────────────────

function Index() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  // Close mobile menu on viewport resize to desktop
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 768) setMenuOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Lock body scroll when menu / lightbox open
  useEffect(() => {
    document.body.style.overflow = menuOpen || lightboxIndex !== null ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, lightboxIndex]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      <Header
        footer={content.footer}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((o) => !o)}
      />
      {menuOpen && <MobileMenu footer={content.footer} onClose={() => setMenuOpen(false)} />}
      <Hero heroContent={content.hero} photos={photos} settings={settings} />
      <Work photos={photos} workContent={content.work} onOpenPhoto={(i) => setLightboxIndex(i)} />
      <About aboutContent={content.about} />
      <Contact contactContent={content.contact} />
      <Footer footerContent={content.footer} />
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNav={setLightboxIndex}
        />
      )}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header({
  footer,
  menuOpen,
  onMenuToggle,
}: {
  footer: SiteContentRow;
  menuOpen: boolean;
  onMenuToggle: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const brandName = textValue(footer, "brand_name", defaultContent.footer.content.brand_name);
  const ctaText = textValue(footer, "cta_text", defaultContent.footer.content.cta_text);
  const isVisible = scrolled || menuOpen;

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
      style={{
        background: isVisible ? "rgba(11,10,9,0.93)" : "transparent",
        backdropFilter: isVisible ? "blur(14px)" : "none",
        borderBottom: isVisible ? "1px solid var(--hr)" : "1px solid transparent",
      }}
    >
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 h-[62px] flex items-center justify-between">
        {/* Logo */}
        <a
          href="#top"
          className="font-display text-xl tracking-tight transition-opacity hover:opacity-70"
          style={{ color: "var(--fg)" }}
        >
          {brandName}
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-10">
          {(["work", "about", "contact"] as const).map((s) => (
            <a
              key={s}
              href={`#${s}`}
              className="text-[0.72rem] tracking-[0.26em] uppercase transition-colors hover:opacity-100"
              style={{ color: "var(--fg-soft)" }}
            >
              {s}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <a
          href="#contact"
          className="hidden md:inline-flex items-center text-[0.72rem] tracking-[0.26em] uppercase transition-opacity hover:opacity-60"
          style={{
            color: "var(--fg)",
            borderBottom: "1px solid var(--accent)",
            paddingBottom: "2px",
          }}
        >
          {ctaText}
        </a>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden flex flex-col gap-[5px] p-2 -mr-2"
          onClick={onMenuToggle}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          <span
            className="block w-6 h-px transition-all duration-300"
            style={{
              background: "var(--fg)",
              transform: menuOpen ? "rotate(45deg) translate(4px,4px)" : "none",
            }}
          />
          <span
            className="block w-4 h-px transition-all duration-300"
            style={{
              background: "var(--fg)",
              opacity: menuOpen ? 0 : 1,
            }}
          />
          <span
            className="block w-6 h-px transition-all duration-300"
            style={{
              background: "var(--fg)",
              transform: menuOpen ? "rotate(-45deg) translate(4px,-4px)" : "none",
            }}
          />
        </button>
      </div>
    </header>
  );
}

// ── Mobile Menu ───────────────────────────────────────────────────────────────

function MobileMenu({ footer, onClose }: { footer: SiteContentRow; onClose: () => void }) {
  const ctaText = textValue(footer, "cta_text", defaultContent.footer.content.cta_text);
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col pt-[62px]"
      style={{ background: "rgba(11,10,9,0.97)", backdropFilter: "blur(18px)" }}
    >
      <nav className="flex flex-col items-center justify-center flex-1 gap-9 pb-16">
        {(["Work", "About", "Contact"] as const).map((s) => (
          <a
            key={s}
            href={`#${s.toLowerCase()}`}
            onClick={onClose}
            className="font-display text-5xl transition-opacity hover:opacity-60"
            style={{ color: "var(--fg)" }}
          >
            {s}
          </a>
        ))}
        <a
          href="#contact"
          onClick={onClose}
          className="mt-6 text-[0.72rem] tracking-[0.30em] uppercase"
          style={{
            color: "var(--accent)",
            borderBottom: "1px solid var(--accent)",
            paddingBottom: "2px",
          }}
        >
          {ctaText}
        </a>
      </nav>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

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
    <section id="top" className="relative min-h-screen overflow-hidden flex flex-col">
      {/* Faint background image */}
      <img
        src={safeImageSrc(heroContent.image_url, defaultContent.hero.image_url || "")}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0.07 }}
      />
      <div className="absolute inset-0 hero-wash" aria-hidden="true" />

      {/* Three.js orbit */}
      <PhotoOrbit photos={photos} settings={settings} />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col mx-auto max-w-[1440px] w-full px-5 md:px-10 pt-36 md:pt-48 pb-20 min-h-screen">
        <div className="max-w-3xl animate-rise">
          <p
            className="eyebrow mb-7 inline-block"
            style={{
              color: "var(--accent)",
              borderBottom: "1px solid var(--accent)",
              paddingBottom: "2px",
            }}
          >
            {textValue(heroContent, "eyebrow", defaultContent.hero.content.eyebrow)}
          </p>
          <h1
            className="font-display leading-[0.90] text-[clamp(3.5rem,10vw,9.5rem)]"
            style={{ color: "var(--fg)" }}
          >
            {textValue(heroContent, "title", defaultContent.hero.content.title)}
            <br />
            <em className="italic" style={{ color: "var(--fg-soft)" }}>
              {textValue(heroContent, "italic_title", defaultContent.hero.content.italic_title)}
            </em>
          </h1>
        </div>

        {/* Bottom row */}
        <div className="mt-auto grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 md:items-end">
          <p
            className="max-w-xl text-base md:text-lg leading-relaxed"
            style={{ color: "var(--fg-soft)" }}
          >
            {textValue(heroContent, "description", defaultContent.hero.content.description)}
          </p>
          <a
            href={safeHref(
              textValue(heroContent, "cta_link", defaultContent.hero.content.cta_link),
            )}
            className="hero-button"
            style={{ borderColor: settings.accent || "var(--accent)" }}
          >
            {textValue(heroContent, "cta_text", defaultContent.hero.content.cta_text)}
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-8 z-10 flex items-center gap-3"
        style={{ opacity: 0.4 }}
      >
        <div className="w-px h-10 overflow-hidden" style={{ background: "var(--hr-strong)" }}>
          <div
            className="w-full h-full"
            style={{
              background: "var(--fg-soft)",
              animation: "scroll-pulse 2s cubic-bezier(0.4,0,0.2,1) infinite",
            }}
          />
        </div>
        <span
          className="text-[0.6rem] tracking-[0.32em] uppercase"
          style={{ color: "var(--fg-soft)" }}
        >
          scroll
        </span>
      </div>
    </section>
  );
}

// ── PhotoOrbit (Three.js) ─────────────────────────────────────────────────────

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
      const selected = photos.filter((_, i) => i !== 5).slice(0, 6);
      selected.forEach((photo, index) => {
        const texture = loader.load(safeImageSrc(photo.src, photo.src));
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.92,
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
      <div className="absolute right-4 top-28 bottom-16 hidden md:grid w-[42vw] grid-cols-2 gap-4 opacity-70">
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
      className="absolute right-0 top-32 bottom-8 w-[82vw] md:w-[38vw] opacity-85"
      aria-hidden="true"
    />
  );
}

// ── Work / Gallery ────────────────────────────────────────────────────────────

function Work({
  photos,
  workContent,
  onOpenPhoto,
}: {
  photos: Photo[];
  workContent: SiteContentRow;
  onOpenPhoto: (index: number) => void;
}) {
  const { ref, visible } = useReveal<HTMLElement>();

  // Build 3 masonry columns
  const cols: { photo: Photo; globalIndex: number }[][] = [[], [], []];
  photos.forEach((p, i) => cols[i % 3].push({ photo: p, globalIndex: i }));

  return (
    <section
      id="work"
      ref={ref}
      className="relative py-24 md:py-36"
      style={{ background: "var(--bg)" }}
    >
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        {/* Section header */}
        <div
          className={`grid grid-cols-1 md:grid-cols-[1fr_380px] gap-8 md:items-end mb-16 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <div>
            <p className="eyebrow mb-5">
              {textValue(workContent, "eyebrow", defaultContent.work.content.eyebrow)}
            </p>
            <h2
              className="font-display text-5xl md:text-7xl leading-[0.92]"
              style={{ color: "var(--fg)" }}
            >
              {textValue(workContent, "title", defaultContent.work.content.title)}
              <br />
              <em className="italic" style={{ color: "var(--fg-soft)" }}>
                {textValue(workContent, "italic_title", defaultContent.work.content.italic_title)}
              </em>
            </h2>
          </div>
          <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--fg-soft)" }}>
            {textValue(workContent, "description", defaultContent.work.content.description)}
          </p>
        </div>

        {/* Masonry grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-4 md:gap-5">
              {col.map(({ photo, globalIndex }) => (
                <PhotoCard
                  key={`${ci}-${globalIndex}-${photo.title}`}
                  photo={photo}
                  index={globalIndex}
                  onOpen={() => onOpenPhoto(globalIndex)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PhotoCard({ photo, index, onOpen }: { photo: Photo; index: number; onOpen: () => void }) {
  return (
    <figure className="group relative cursor-pointer" onClick={onOpen}>
      {/* Image */}
      <div className="relative overflow-hidden" style={{ background: "var(--bg-raised)" }}>
        <img
          src={safeImageSrc(photo.src, photo.src)}
          alt={photo.alt}
          width={photo.w}
          height={photo.h}
          loading="lazy"
          className="w-full h-auto block transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        {/* Hover overlay */}
        <div className="photo-overlay absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <p className="font-display italic text-lg leading-tight" style={{ color: "var(--fg)" }}>
            {photo.title}
          </p>
          {photo.place && (
            <p
              className="text-[0.62rem] tracking-[0.22em] uppercase mt-1"
              style={{ color: "var(--fg-soft)" }}
            >
              {photo.place}
              {photo.year ? ` — ${photo.year}` : ""}
            </p>
          )}
          {/* Expand icon */}
          <div
            className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full"
            style={{ background: "rgba(242,237,229,0.12)", backdropFilter: "blur(6px)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M1.5 10.5L10.5 1.5M10.5 1.5H4.5M10.5 1.5V7.5"
                stroke="white"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Caption */}
      <figcaption className="mt-3 flex items-baseline justify-between gap-4 px-0.5">
        <div>
          <p className="font-display italic text-lg" style={{ color: "var(--fg)" }}>
            {photo.title}
          </p>
          {photo.place && <p className="eyebrow mt-0.5">{photo.place}</p>}
        </div>
        <p className="text-xs tabular-nums shrink-0" style={{ color: "var(--fg-muted)" }}>
          {String(index + 1).padStart(2, "0")}
          {photo.year ? ` · ${photo.year}` : ""}
        </p>
      </figcaption>
    </figure>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({
  photos,
  index,
  onClose,
  onNav,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onNav: (index: number) => void;
}) {
  const photo = photos[index];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onNav(index - 1);
      if (e.key === "ArrowRight" && index < photos.length - 1) onNav(index + 1);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [index, onClose, onNav, photos.length]);

  if (!photo) return null;

  return (
    <div
      className="lightbox-backdrop fixed inset-0 z-[100] flex flex-col"
      style={{ background: "rgba(7,6,5,0.97)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 md:px-8 h-14 shrink-0"
        style={{ borderBottom: "1px solid var(--hr)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className="text-[0.65rem] tracking-[0.28em] uppercase"
          style={{ color: "var(--fg-muted)" }}
        >
          {String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
        </p>
        <button
          type="button"
          className="flex items-center gap-2 text-[0.68rem] tracking-[0.22em] uppercase transition-opacity hover:opacity-60"
          style={{ color: "var(--fg-soft)" }}
          onClick={onClose}
        >
          Close
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M1 1L11 11M11 1L1 11"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center relative px-12 md:px-20 py-6 overflow-hidden">
        {/* Prev */}
        {index > 0 && (
          <button
            type="button"
            className="absolute left-3 md:left-6 flex items-center justify-center w-9 h-9 transition-opacity hover:opacity-60"
            style={{ color: "var(--fg)" }}
            onClick={(e) => {
              e.stopPropagation();
              onNav(index - 1);
            }}
            aria-label="Previous photo"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M12 3L5 9L12 15"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        {/* Next */}
        {index < photos.length - 1 && (
          <button
            type="button"
            className="absolute right-3 md:right-6 flex items-center justify-center w-9 h-9 transition-opacity hover:opacity-60"
            style={{ color: "var(--fg)" }}
            onClick={(e) => {
              e.stopPropagation();
              onNav(index + 1);
            }}
            aria-label="Next photo"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M6 3L13 9L6 15"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        {/* Photo */}
        <img
          key={photo.src}
          src={safeImageSrc(photo.src, photo.src)}
          alt={photo.alt}
          className="lightbox-img max-h-full max-w-full object-contain"
          style={{ maxHeight: "calc(100vh - 8rem)" }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Caption bar */}
      <div
        className="shrink-0 px-5 md:px-8 py-5 flex items-start justify-between gap-8"
        style={{ borderTop: "1px solid var(--hr)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="font-display italic text-xl" style={{ color: "var(--fg)" }}>
            {photo.title}
          </p>
          {photo.place && (
            <p
              className="text-[0.65rem] tracking-[0.22em] uppercase mt-1"
              style={{ color: "var(--fg-soft)" }}
            >
              {photo.place}
              {photo.year ? ` · ${photo.year}` : ""}
            </p>
          )}
          {photo.caption && (
            <p
              className="text-sm leading-relaxed mt-2"
              style={{ color: "var(--fg-soft)", maxWidth: "50ch" }}
            >
              {photo.caption}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── About ─────────────────────────────────────────────────────────────────────

function About({ aboutContent }: { aboutContent: SiteContentRow }) {
  const { ref, visible } = useReveal<HTMLElement>();

  return (
    <section
      id="about"
      ref={ref}
      className="relative py-24 md:py-36"
      style={{ background: "var(--bg-card)", borderTop: "1px solid var(--hr)" }}
    >
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 items-start">
        {/* Portrait */}
        <div
          className={`md:col-span-5 transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="relative overflow-hidden" style={{ border: "1px solid var(--hr)" }}>
            <img
              src={safeImageSrc(aboutContent.image_url, defaultContent.about.image_url || "")}
              alt={textValue(aboutContent, "image_alt", defaultContent.about.content.image_alt)}
              width={960}
              height={1280}
              loading="lazy"
              className="w-full h-auto block"
            />
          </div>
        </div>

        {/* Text */}
        <div
          className={`md:col-span-7 md:pt-6 transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <p className="eyebrow mb-7">
            {textValue(aboutContent, "eyebrow", defaultContent.about.content.eyebrow)}
          </p>
          <h2
            className="font-display text-4xl md:text-[3.5rem] leading-[0.95] mb-10"
            style={{ color: "var(--fg)" }}
          >
            {textValue(aboutContent, "title", defaultContent.about.content.title)}
            <br />
            <em className="italic" style={{ color: "var(--fg-soft)" }}>
              {textValue(aboutContent, "italic_title", defaultContent.about.content.italic_title)}
            </em>
          </h2>
          <div
            className="space-y-6 text-base md:text-[1.05rem] leading-[1.75] max-w-2xl"
            style={{ color: "var(--fg-soft)" }}
          >
            <p>
              {textValue(aboutContent, "paragraph_1", defaultContent.about.content.paragraph_1)}
            </p>
            <p>
              {textValue(aboutContent, "paragraph_2", defaultContent.about.content.paragraph_2)}
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-8 max-w-sm">
            {statsValue(aboutContent).map((stat, i) => (
              <Stat key={`${stat.n}-${stat.label}-${i}`} n={stat.n} label={stat.label} />
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
    <div style={{ borderTop: "1px solid var(--hr)", paddingTop: "1rem" }}>
      <p className="font-display text-4xl" style={{ color: "var(--accent)" }}>
        {n}
      </p>
      <p className="eyebrow mt-2">{label}</p>
    </div>
  );
}

// ── Contact ───────────────────────────────────────────────────────────────────

function Contact({ contactContent }: { contactContent: SiteContentRow }) {
  const { ref, visible } = useReveal<HTMLElement>();
  const email = textValue(contactContent, "email", defaultContent.contact.content.email);
  const instagramLink = textValue(
    contactContent,
    "instagram_link",
    defaultContent.contact.content.instagram_link,
  );

  return (
    <section
      id="contact"
      ref={ref}
      className="relative py-24 md:py-36"
      style={{ background: "#070605", borderTop: "1px solid var(--hr)" }}
    >
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <p className="eyebrow mb-7" style={{ color: "var(--fg-muted)" }}>
          {textValue(contactContent, "eyebrow", defaultContent.contact.content.eyebrow)}
        </p>
        <h2
          className={`font-display leading-[0.92] max-w-4xl text-[clamp(2.5rem,8vw,6rem)] transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{ color: "var(--fg)" }}
        >
          {textValue(contactContent, "title", defaultContent.contact.content.title)}
          <br />
          <em className="italic" style={{ color: "var(--fg-soft)" }}>
            {textValue(contactContent, "italic_title", defaultContent.contact.content.italic_title)}
          </em>
        </h2>
        <p className="mt-8 max-w-2xl leading-relaxed" style={{ color: "var(--fg-soft)" }}>
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
      <p className="eyebrow mb-3" style={{ color: "rgba(242,237,229,0.40)" }}>
        {label}
      </p>
      <p className="font-display text-2xl md:text-3xl" style={{ color: "var(--fg)" }}>
        {value}
      </p>
    </>
  );
  return (
    <div style={{ borderTop: "1px solid rgba(242,237,229,0.14)", paddingTop: "1.5rem" }}>
      {href ? (
        <a href={href} className="block transition-opacity hover:opacity-70">
          {inner}
        </a>
      ) : (
        inner
      )}
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer({ footerContent }: { footerContent: SiteContentRow }) {
  const year = new Date().getFullYear();
  return (
    <footer style={{ background: "#060504", color: "var(--fg)" }}>
      <div
        className="mx-auto max-w-[1440px] px-5 md:px-10 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        style={{ borderTop: "1px solid rgba(242,237,229,0.08)" }}
      >
        <p className="font-display text-lg" style={{ color: "var(--fg)" }}>
          {textValue(footerContent, "brand_name", defaultContent.footer.content.brand_name)}
        </p>
        <p
          className="text-xs tracking-[0.22em] uppercase"
          style={{ color: "rgba(242,237,229,0.38)" }}
        >
          {year}{" "}
          {textValue(footerContent, "copyright_text", defaultContent.footer.content.copyright_text)}
        </p>
        <p
          className="max-w-xs text-xs tracking-[0.18em] uppercase"
          style={{ color: "rgba(242,237,229,0.30)" }}
        >
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
