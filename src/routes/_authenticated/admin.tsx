import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Photo = Tables<"photos">;

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Manage Photos — Varun Nagalla" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

// 1 year signed URL (storage max)
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 365;

async function fetchPhotos(): Promise<Photo[]> {
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
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

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: photos = [], isLoading } = useQuery({ queryKey: ["photos"], queryFn: fetchPhotos });
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

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
            <span className="text-[0.7rem] tracking-[0.28em] uppercase text-ink-soft">Studio</span>
          </div>
          <div className="flex items-center gap-6 text-[0.78rem] tracking-[0.22em] uppercase">
            <Link to="/" className="text-ink-soft hover:text-ink">View site</Link>
            <button onClick={signOut} className="text-ink-soft hover:text-ink">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 md:px-10 py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <p className="eyebrow mb-3">Signed in as {adminEmail}</p>
            <h1 className="font-display text-5xl md:text-6xl leading-[1]">Manage photographs</h1>
          </div>
          <p className="text-sm text-ink-soft max-w-sm">
            {photos.length} {photos.length === 1 ? "photo" : "photos"} in the public gallery.
          </p>
        </div>

        {isAdmin === false && (
          <div className="mb-10 border border-rule bg-paper-soft p-6">
            <p className="font-display text-xl mb-2">No admin permission</p>
            <p className="text-sm text-ink-soft">
              This account isn't the site administrator. Only the first registered account becomes admin.
            </p>
          </div>
        )}

        {isAdmin && <UploadForm onDone={() => qc.invalidateQueries({ queryKey: ["photos"] })} />}

        <div className="hairline mt-16 pt-12">
          <h2 className="font-display text-3xl mb-8">Current gallery</h2>
          {isLoading ? (
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
      </main>
    </div>
  );
}

function UploadForm({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const dims = await readImageDimensions(file);
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage.from("photos").upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type,
      });
      if (upErr) throw upErr;

      const { data: signed, error: signErr } = await supabase.storage
        .from("photos")
        .createSignedUrl(path, SIGNED_URL_EXPIRY);
      if (signErr || !signed) throw signErr ?? new Error("Failed to sign URL");

      const { error: insErr } = await supabase.from("photos").insert({
        title: title.trim() || "Untitled",
        place: place.trim(),
        year: year.trim(),
        image_url: signed.signedUrl,
        storage_path: path,
        alt_text: title.trim() || "Photograph",
        width: dims.width,
        height: dims.height,
        sort_order: 0,
      });
      if (insErr) throw insErr;

      setFile(null);
      setTitle("");
      setPlace("");
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

function PhotoItem({
  photo, canEdit, onChange,
}: { photo: Photo; canEdit: boolean; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(photo.title);
  const [place, setPlace] = useState(photo.place);
  const [year, setYear] = useState(photo.year);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await supabase
      .from("photos")
      .update({ title, place, year, alt_text: title })
      .eq("id", photo.id);
    setBusy(false);
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
            <div className="flex gap-2 mt-2">
              <button
                onClick={save} disabled={busy}
                className="flex-1 bg-ink text-paper py-2 text-xs tracking-[0.22em] uppercase hover:opacity-80 disabled:opacity-50"
              >Save</button>
              <button
                onClick={() => { setEditing(false); setTitle(photo.title); setPlace(photo.place); setYear(photo.year); }}
                className="flex-1 border border-ink py-2 text-xs tracking-[0.22em] uppercase hover:bg-ink hover:text-paper"
              >Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="font-display italic text-xl">{photo.title}</p>
              <p className="eyebrow mt-1">{photo.place || "—"} · {photo.year || "—"}</p>
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
