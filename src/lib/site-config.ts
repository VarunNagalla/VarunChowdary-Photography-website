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

export const ADMIN_EMAIL = "varunchowdary3345@gmail.com";

export type Photo = {
  src: string;
  alt: string;
  title: string;
  place: string;
  year: string;
  caption: string;
  w: number;
  h: number;
};

export type SiteContentRow = {
  section_key: string;
  content: Record<string, unknown>;
  image_url: string | null;
  storage_path: string | null;
};

export type ContentMap = Record<string, SiteContentRow>;

export type SiteSettings = {
  theme: "warm" | "noir" | "sage";
  accent: string;
  animationIntensity: "calm" | "balanced" | "cinematic";
  backgroundStyle: "soft" | "clean" | "contrast";
  seoTitle: string;
  seoDescription: string;
  socialImage: string;
};

export const fallbackPhotos: Photo[] = [
  {
    src: photo1,
    alt: "A quiet frame captured through Varun's lens",
    title: "Soft Light",
    place: "A remembered place",
    year: "2024",
    caption: "A frame I kept for its calm light and simple mood.",
    w: 1024,
    h: 1024,
  },
  {
    src: photo2,
    alt: "A misty outdoor view",
    title: "Morning Stillness",
    place: "Outside",
    year: "2024",
    caption: "A small moment where the air, light, and silence felt worth saving.",
    w: 1280,
    h: 896,
  },
  {
    src: photo3,
    alt: "Shapes and sunlight in a captured scene",
    title: "Lines And Light",
    place: "Everyday view",
    year: "2024",
    caption: "I liked the way the light touched the shapes in this scene.",
    w: 960,
    h: 1280,
  },
  {
    src: photo4,
    alt: "A night scene captured by Varun",
    title: "After Dark",
    place: "Evening walk",
    year: "2024",
    caption: "A photo from a night that felt still, bright, and memorable.",
    w: 1024,
    h: 1024,
  },
  {
    src: photo5,
    alt: "Small natural details in close view",
    title: "Small Details",
    place: "Close up",
    year: "2024",
    caption: "The kind of tiny detail that is easy to miss until the camera finds it.",
    w: 1280,
    h: 960,
  },
  {
    src: photo6,
    alt: "A warm human moment",
    title: "A Real Moment",
    place: "With people",
    year: "2024",
    caption: "I enjoy photos that feel natural and honest, even in a quick second.",
    w: 960,
    h: 1280,
  },
  {
    src: photo7,
    alt: "Warm light across an open landscape",
    title: "Long Light",
    place: "Open space",
    year: "2024",
    caption: "A frame I captured because the light stayed with me.",
    w: 1280,
    h: 854,
  },
  {
    src: photo8,
    alt: "Hands and texture captured in detail",
    title: "Remembered Detail",
    place: "Close view",
    year: "2024",
    caption: "A simple detail that felt personal enough to keep.",
    w: 1024,
    h: 1024,
  },
];

export const defaultContent = {
  hero: {
    section_key: "hero",
    image_url: hero,
    storage_path: null,
    content: {
      eyebrow: "Personal photography portfolio",
      title: "Moments I captured,",
      italic_title: "the way I saw them.",
      description:
        "This is a personal collection of photos I've taken through my lens. Each image is a moment, place, or detail I wanted to remember and share.",
      cta_text: "View My Work",
      cta_link: "#work",
      image_alt: "A photograph captured by Varun",
    },
  },
  work: {
    section_key: "work",
    image_url: null,
    storage_path: null,
    content: {
      eyebrow: "Favorite frames",
      title: "Photos I captured",
      italic_title: "because they stayed with me.",
      description:
        "These are some of my favorite frames, chosen for their mood, light, place, detail, and the memory behind each picture.",
    },
  },
  about: {
    section_key: "about",
    image_url: portrait,
    storage_path: null,
    content: {
      eyebrow: "About Varun",
      title: "I see the world",
      italic_title: "through a camera.",
      paragraph_1:
        "I'm Varun, a passionate photographer who enjoys capturing moments, places, people, light, and small details that usually go unnoticed. Photography is something I do because I genuinely love seeing the world through a camera.",
      paragraph_2:
        "This website is a personal space for the images I've taken. Every photo here is part of my journey, my perspective, and the way I choose to remember a moment.",
      image_alt: "Portrait for VC Photography",
      stats: [
        { n: "01", label: "Personal collection" },
        { n: "08", label: "Favorite frames" },
        { n: "100%", label: "Captured by me" },
        { n: "VC", label: "Photography" },
      ],
    },
  },
  contact: {
    section_key: "contact",
    image_url: null,
    storage_path: null,
    content: {
      eyebrow: "Connect",
      title: "Like my photos?",
      italic_title: "Let's connect.",
      description:
        "I'm always learning, exploring, and capturing new moments. If you like my work or want to connect about photography, feel free to reach out.",
      email_label: "Email",
      email: "varunchowdary3345@gmail.com",
      instagram_label: "Instagram",
      instagram: "@vc.photography",
      instagram_link: "https://instagram.com",
      studio_label: "Location",
      studio: "Personal portfolio",
    },
  },
  footer: {
    section_key: "footer",
    image_url: null,
    storage_path: null,
    content: {
      brand_name: "VC Photography",
      copyright_text: "VC Photography. All rights reserved.",
      protection_text:
        "All photos shown here are captured and shared as part of my personal photography portfolio.",
      cta_text: "Connect",
    },
  },
} satisfies ContentMap;

export const defaultSettings: SiteSettings = {
  theme: "warm",
  accent: "#9b6a45",
  animationIntensity: "balanced",
  backgroundStyle: "soft",
  seoTitle: "VC Photography | Personal Photography Portfolio",
  seoDescription:
    "A personal photography portfolio by Varun, sharing moments, places, light, and small details captured through his lens.",
  socialImage: hero,
};

export function textValue(row: SiteContentRow | undefined, key: string, fallback: string) {
  const value = row?.content?.[key];
  return typeof value === "string" ? value : fallback;
}

export function mergeContent(rows: SiteContentRow[]): ContentMap {
  return rows.reduce<ContentMap>(
    (acc, row) => {
      acc[row.section_key] = {
        ...defaultContent[row.section_key as keyof typeof defaultContent],
        ...row,
        content: {
          ...(defaultContent[row.section_key as keyof typeof defaultContent]?.content ?? {}),
          ...(row.content ?? {}),
        },
      };
      return acc;
    },
    { ...defaultContent },
  );
}
