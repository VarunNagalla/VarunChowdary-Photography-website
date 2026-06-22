import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";

type Photo = Tables<"photos">;
type SiteContent = Tables<"site_content">;
type AdminTab = "content" | "gallery";

type ContentField = {
  name: string;
  label: string;
  type?: "text" | "textarea";
};

type ContentSectionConfig = {
  key: "hero" | "work" | "about" | "contact" | "footer";
  title: string;
  description: string;
  imageLabel?: string;
  fields: ContentField[];
};

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Varun Nagalla Photography" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

// 1 year signed URL, matching the existing private storage approach.
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 365;

const contentSections: ContentSectionConfig[] = [
  {
    key: "hero",
    title: "Hero section",
    description: "Main screen text, CTA, and background image.",
    imageLabel: "Hero background image",
    fields: [
      { name: "eyebrow", label: "Small top text" },
      { name: "title", label: "Main title" },
      { name: "italic_title", label: "Italic title" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "cta_text", label: "Button text" },
      { name: "cta_link", label: "Button link" },
      { name: "image_alt", label: "Image alt text" },
    ],
  },
  {
    key: "work",
    title: "Work intro",
    description: "Text above the public gallery.",
    fields: [
      { name: "eyebrow", label: "Small top text" },
      { name: "title", label: "Heading line 1" },
      { name: "italic_title", label: "Italic heading line" },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    key: "about",
    title: "About section",
    description: "Biography, portrait image, and stats.",
    imageLabel: "About portrait image",
    fields: [
      { name: "eyebrow", label: "Small top text" },
      { name: "title", label: "Heading line 1" },
      { name: "italic_title", label: "Italic heading line" },
      { name: "paragraph_1", label: "Paragraph 1", type: "textarea" },
      { name: "paragraph_2", label: "Paragraph 2", type: "textarea" },
      { name: "image_alt", label: "Image alt text" },
      { name: "stat_1_n", label: "Stat 1 number" },
      { name: "stat_1_label", label: "Stat 1 label" },
      { name: "stat_2_n", label: "Stat 2 number" },
      { name: "stat_2_label", label: "Stat 2 label" },
      { name: "stat_3_n", label: "Stat 3 number" },
      { name: "stat_3_label", label: "Stat 3 label" },
      { name: "stat_4_n", label: "Stat 4 number" },
      { name: "stat_4_label", label: "Stat 4 label" },
    ],
  },
  {
    key: "contact",
    title: "Contact section",
    description: "Inquiry headline and contact links.",
    fields: [
      { name: "eyebrow", label: "Small top text" },
      { name: "title", label: "Heading line 1" },
      { name: "italic_title", label: "Italic heading line" },
      { name: "email_label", label: "Email label" },
      { name: "email", label: "Email address" },
      { name: "instagram_label", label: "Instagram label" },
      { name: "instagram", label: "Instagram display text" },
      { name: "instagram_link", label: "Instagram link" },
      { name: "studio_label", label: "Studio/location label" },
      { name: "studio", label: "Studio/location text" },
    ],
  },
  {
    key: "footer",
    title: "Footer and header",
    description: "Brand name, commission text, and footer copyright.",
    fields: [
      { name: "brand_name", label: "Brand name" },
      { name: "commission_text", label: "Header CTA text" },
      { name: "copyright_text", label: "Copyright text" },
      { name: "protection_text", label: "Image protection text" },
    ],
  },
];

async function fetchPhotos(): Promise<Photo[]> {
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function fetchSiteContent(): Promise<SiteContent[]> {
  const { data, error } = await supabase
    .from("site_content")
    .select("*")
    .order("section_key", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 1200, height: 1200 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function getContentObject(row?: SiteContent): Record<string, unknown> {
  if (!row?.content || typeof row.content !== "object" || Array.isArray(row.content)) return {};
  return row.content as Record<string, unknown>;
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: string, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function uploadPrivateImage(file: File, folder: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("photos").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (uploadError) throw uploadError;

  const { data: signed, error: signError } = await supabase.storage
    .from("photos")
    .createSignedUrl(path, SIGNED_URL_EXPIRY);
  if (signError || !signed) throw signError ?? new Error("Failed to create image URL");

  return { path, signedUrl: signed.signedUrl };
}

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: photos = [], isLoading: photosLoading } = useQuery({ queryKey: ["photos"], queryFn: fetchPhotos });
  const { data: siteContent = [], isLoading: contentLoading } = useQuery({ queryKey: ["admin-site-content"], queryFn: fetchSiteContent });
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("content");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setAdminEmail(u.user?.email ?? null);
      if (!u.user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    })();
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="font-display text-xl">Varun Nagalla</Link>
            <span className="text-[0.7rem] tracking-[0.28em] uppercase text-ink-soft">Studio Admin</span>
          </div>
          <div className="flex items-center gap-6 text-[0.78rem] tracking-[0.22em] uppercase">
            <Link to="/" className="text-ink-soft hover:text-ink">View site</Link>
            <button onClick={signOut} className="text-ink-soft hover:text-ink">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 md:px-10 py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <p className="eyebrow mb-3">Signed in as {adminEmail}</p>
            <h1 className="font-display text-5xl md:text-6xl leading-[1]">Website admin</h1>
          </div>
          <p className="text-sm text-ink-soft max-w-sm">
            Edit public website text, background images, contact details, and gallery photos from one place.
          </p>
        </div>

        {isAdmin === false && (
          <div className="mb-10 border border-rule bg-paper-soft p-6">
            <p className="font-display text-xl mb-2">No admin permission</p>
            <p className="text-sm text-ink-soft">
              This account isn't the site administrator. Only an admin can edit website content.
            </p>
          </div>
        )}

        <div className="mb-10 flex flex-wrap gap-3">
          <TabButton active={activeTab === "content"} onClick={() => setActiveTab("content")}>Website Content</TabButton>
          <TabButton active={activeTab === "gallery"} onClick={() => setActiveTab("gallery")}>Gallery</TabButton>
        </div>

        {activeTab === "content" && (
          <section>
            <div className="mb-8">
              <h2 className="font-display text-3xl mb-2">Editable website content</h2>
              <p className="text-sm text-ink-soft max-w-2xl">
                Update text and images here, then open the public site to see the changes. Missing content safely falls back to the original design text.
              </p>
            </div>

            {contentLoading ? (
              <p className="text-ink-soft">Loading content…</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {contentSections.map((section) => (
                  <ContentSectionEditor
                    key={section.key}
                    config={section}
                    row={siteContent.find((item) => item.section_key === section.key)}
                    canEdit={!!isAdmin}
                    onDone={() => qc.invalidateQueries({ queryKey: ["admin-site-content"] })}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "gallery" && (
          <section>
            {isAdmin && <UploadForm onDone={() => qc.invalidateQueries({ queryKey: ["photos"] })} />}

            <div className="hairline mt-16 pt-12">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                <div>
                  <h2 className="font-display text-3xl">Current gallery</h2>
                  <p className="text-sm text-ink-soft mt-2">
                    {photos.length} {photos.length === 1 ? "photo" : "photos"}. Unpublished photos stay hidden from the public website.
                  </p>
                </div>
              </div>

              {photosLoading ? (
                <p className="text-ink-soft">Loading…</p>
              ) : photos.length === 0 ? (
                <p className="text-ink-soft">No photos yet. Upload your first frame above.</p>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {photos.map((p) => (
                    <PhotoItem key={p.id} photo={p} canEdit={!!isAdmin} onChange={() => qc.invalidateQueries({ queryKey: ["photos"] })} />
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-3 border text-[0.78rem] tracking-[0.22em] uppercase transition ${
        active ? "bg-ink text-paper border-ink" : "border-rule text-ink-soft hover:border-ink hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function ContentSectionEditor({
  config,
  row,
  canEdit,
  onDone,
}: {
  config: ContentSectionConfig;
  row?: SiteContent;
  canEdit: boolean;
  onDone: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => getInitialContentValues(config, row));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setValues(getInitialContentValues(config, row));
    setFile(null);
    setMessage(null);
    setErr(null);
  }, [config, row]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    setBusy(true);
    setErr(null);
    setMessage(null);

    try {
      let imageUrl = row?.image_url ?? null;
      let storagePath = row?.storage_path ?? null;

      if (file) {
        const uploaded = await uploadPrivateImage(file, `site-content/${config.key}`);
        imageUrl = uploaded.signedUrl;
        if (storagePath) await supabase.storage.from("photos").remove([storagePath]);
        storagePath = uploaded.path;
      }

      const content = buildContentPayload(config, values);
      const { error } = await supabase.from("site_content").upsert(
        {
          section_key: config.key,
          content: content as Json,
          image_url: imageUrl,
          storage_path: storagePath,
        },
        { onConflict: "section_key" },
      );
      if (error) throw error;

      setMessage("Saved. Open the public site to check it.");
      setFile(null);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="border border-rule p-6 flex flex-col gap-5">
      <div>
        <h3 className="font-display text-2xl">{config.title}</h3>
        <p className="text-sm text-ink-soft mt-1">{config.description}</p>
      </div>

      {config.imageLabel && (
        <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 items-start border border-rule p-4 bg-paper-soft/60">
          <div>
            {row?.image_url ? (
              <img src={row.image_url} alt="Current section" className="w-full aspect-square object-cover" />
            ) : (
              <div className="w-full aspect-square bg-muted" />
            )}
          </div>
          <label className="block">
            <span className="eyebrow block mb-2">{config.imageLabel}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={!canEdit || busy}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:border file:border-ink file:bg-transparent file:text-xs file:tracking-[0.22em] file:uppercase file:cursor-pointer hover:file:bg-ink hover:file:text-paper"
            />
            {file && <p className="text-xs text-ink-soft mt-2">Selected: {file.name}</p>}
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {config.fields.map((field) => (
          field.type === "textarea" ? (
            <TextAreaField
              key={field.name}
              label={field.label}
              value={values[field.name] ?? ""}
              onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
            />
          ) : (
            <Field
              key={field.name}
              label={field.label}
              value={values[field.name] ?? ""}
              onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
            />
          )
        ))}
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {err && <p className="text-sm text-red-700">{err}</p>}

      <button
        type="submit"
        disabled={!canEdit || busy}
        className="self-start bg-ink text-paper px-7 py-3 text-[0.78rem] tracking-[0.22em] uppercase hover:opacity-80 transition disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save section"}
      </button>
    </form>
  );
}

function getInitialContentValues(config: ContentSectionConfig, row?: SiteContent) {
  const content = getContentObject(row);
  const values = config.fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.name] = getString(content[field.name]);
    return acc;
  }, {});

  if (config.key === "about") {
    const stats = Array.isArray(content.stats) ? content.stats : [];
    for (let index = 0; index < 4; index += 1) {
      const item = stats[index];
      const stat = item && typeof item === "object" ? item as Record<string, unknown> : {};
      values[`stat_${index + 1}_n`] = getString(stat.n, values[`stat_${index + 1}_n`] ?? "");
      values[`stat_${index + 1}_label`] = getString(stat.label, values[`stat_${index + 1}_label`] ?? "");
    }
  }

  return values;
}

function buildContentPayload(config: ContentSectionConfig, values: Record<string, string>) {
  const content: Record<string, unknown> = {};

  config.fields.forEach((field) => {
    if (!field.name.startsWith("stat_")) content[field.name] = values[field.name] ?? "";
  });

  if (config.key === "about") {
    content.stats = [1, 2, 3, 4]
      .map((index) => ({
        n: values[`stat_${index}_n`] ?? "",
        label: values[`stat_${index}_label`] ?? "",
      }))
      .filter((item) => item.n || item.label);
  }

  return content;
}

function UploadForm({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [caption, setCaption] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isPublished, setIsPublished] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const dims = await readImageDimensions(file);
      const uploaded = await uploadPrivateImage(file, "gallery");

      const { error: insErr } = await supabase.from("photos").insert({
        title: title.trim() || "Untitled",
        place: place.trim(),
        year: year.trim(),
        caption: caption.trim(),
        image_url: uploaded.signedUrl,
        storage_path: uploaded.path,
        alt_text: title.trim() || "Photograph",
        width: dims.width,
        height: dims.height,
        sort_order: numberValue(sortOrder),
        is_published: isPublished,
      });
      if (insErr) throw insErr;

      setFile(null);
      setTitle("");
      setPlace("");
      setCaption("");
      setSortOrder("0");
      setIsPublished(true);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="border border-rule p-6 md:p-10">
      <h2 className="font-display text-3xl mb-6">Upload a new photograph</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label className="block md:col-span-2">
          <span className="eyebrow block mb-2">Image file</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:border file:border-ink file:bg-transparent file:text-xs file:tracking-[0.22em] file:uppercase file:cursor-pointer hover:file:bg-ink hover:file:text-paper"
          />
        </label>
        <Field label="Title" value={title} onChange={setTitle} required />
        <Field label="Place" value={place} onChange={setPlace} />
        <Field label="Year" value={year} onChange={setYear} />
        <Field label="Sort order" value={sortOrder} onChange={setSortOrder} />
        <TextAreaField label="Caption" value={caption} onChange={setCaption} />
        <CheckboxField label="Publish on public website" checked={isPublished} onChange={setIsPublished} />
      </div>
      {err && <p className="mt-4 text-sm text-red-700">{err}</p>}
      <button
        type="submit"
        disabled={busy || !file}
        className="mt-8 bg-ink text-paper px-8 py-3 text-[0.78rem] tracking-[0.22em] uppercase hover:opacity-80 transition disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Add to gallery"}
      </button>
    </form>
  );
}

function Field({
  label, value, onChange, required,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="eyebrow block mb-2">{label}</span>
      <input
        type="text"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-2 text-base font-display"
      />
    </label>
  );
}

function TextAreaField({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block md:col-span-2">
      <span className="eyebrow block mb-2">{label}</span>
      <textarea
        value={value}
        rows={4}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border border-rule focus:border-ink outline-none p-3 text-base leading-relaxed"
      />
    </label>
  );
}

function CheckboxField({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 md:col-span-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-current"
      />
      <span className="eyebrow">{label}</span>
    </label>
  );
}

function PhotoItem({
  photo, canEdit, onChange,
}: { photo: Photo; canEdit: boolean; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(photo.title);
  const [place, setPlace] = useState(photo.place);
  const [year, setYear] = useState(photo.year);
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [sortOrder, setSortOrder] = useState(String(photo.sort_order ?? 0));
  const [isPublished, setIsPublished] = useState(photo.is_published ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase
      .from("photos")
      .update({
        title,
        place,
        year,
        caption,
        sort_order: numberValue(sortOrder, photo.sort_order ?? 0),
        is_published: isPublished,
        alt_text: title,
      })
      .eq("id", photo.id);
    setBusy(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setEditing(false);
    onChange();
  }

  async function remove() {
    if (!confirm(`Delete "${photo.title}"? This cannot be undone.`)) return;
    setBusy(true);
    if (photo.storage_path) {
      await supabase.storage.from("photos").remove([photo.storage_path]);
    }
    await supabase.from("photos").delete().eq("id", photo.id);
    setBusy(false);
    onChange();
  }

  return (
    <li className="flex flex-col border border-rule">
      <img src={photo.image_url} alt={photo.alt_text} className="w-full aspect-[4/5] object-cover" loading="lazy" />
      <div className="p-4 flex flex-col gap-3">
        {editing ? (
          <>
            <Field label="Title" value={title} onChange={setTitle} />
            <Field label="Place" value={place} onChange={setPlace} />
            <Field label="Year" value={year} onChange={setYear} />
            <Field label="Sort order" value={sortOrder} onChange={setSortOrder} />
            <TextAreaField label="Caption" value={caption} onChange={setCaption} />
            <CheckboxField label="Publish on public website" checked={isPublished} onChange={setIsPublished} />
            {err && <p className="text-sm text-red-700">{err}</p>}
            <div className="flex gap-2 mt-2">
              <button
                onClick={save} disabled={busy}
                className="flex-1 bg-ink text-paper py-2 text-xs tracking-[0.22em] uppercase hover:opacity-80 disabled:opacity-50"
              >Save</button>
              <button
                onClick={() => {
                  setEditing(false);
                  setTitle(photo.title);
                  setPlace(photo.place);
                  setYear(photo.year);
                  setCaption(photo.caption ?? "");
                  setSortOrder(String(photo.sort_order ?? 0));
                  setIsPublished(photo.is_published ?? true);
                }}
                className="flex-1 border border-ink py-2 text-xs tracking-[0.22em] uppercase hover:bg-ink hover:text-paper"
              >Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="flex items-start justify-between gap-4">
                <p className="font-display italic text-xl">{photo.title}</p>
                <span className={`text-[0.65rem] tracking-[0.18em] uppercase ${photo.is_published ? "text-green-700" : "text-red-700"}`}>
                  {photo.is_published ? "Published" : "Hidden"}
                </span>
              </div>
              <p className="eyebrow mt-1">{photo.place || "—"} · {photo.year || "—"} · Order {photo.sort_order ?? 0}</p>
              {photo.caption && <p className="text-sm text-ink-soft leading-relaxed mt-3">{photo.caption}</p>}
            </div>
            {canEdit && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setEditing(true)}
                  className="flex-1 border border-ink py-2 text-xs tracking-[0.22em] uppercase hover:bg-ink hover:text-paper"
                >Edit</button>
                <button
                  onClick={remove} disabled={busy}
                  className="flex-1 border border-red-700 text-red-700 py-2 text-xs tracking-[0.22em] uppercase hover:bg-red-700 hover:text-paper disabled:opacity-50"
                >Delete</button>
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}
