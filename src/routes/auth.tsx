import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_EMAIL } from "@/lib/site-config";

const AUTH_CHECK_TIMEOUT_MS = 5000;

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Admin sign in | VC Photography" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    withTimeout(supabase.auth.getUser(), AUTH_CHECK_TIMEOUT_MS)
      .then(({ data }) => {
        if (active && data.user) navigate({ to: "/admin" });
      })
      .catch(() => {
        // A slow session check should never block typing into the sign-in form.
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function resetSession() {
    setError(null);
    setLoading(true);
    try {
      await supabase.auth.signOut();
      Object.keys(localStorage)
        .filter((key) => key.includes("supabase") || key.startsWith("sb-"))
        .forEach((key) => localStorage.removeItem(key));
      window.location.href = `${import.meta.env.BASE_URL}auth?reset=${Date.now()}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the session");
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(data.get("password") ?? "");

    if (email !== ADMIN_EMAIL) {
      setError("This admin area is restricted to the site owner.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <header className="mx-auto max-w-[1400px] w-full px-6 md:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="font-display text-xl">
          VC Photography
        </Link>
        <Link
          to="/"
          className="text-[0.78rem] tracking-[0.22em] uppercase text-ink-soft hover:text-ink"
        >
          Back to site
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <p className="eyebrow mb-4">Owner access</p>
          <h1 className="font-display text-5xl mb-10 leading-none">Sign in</h1>

          <form onSubmit={submit} className="space-y-5">
            <label className="block">
              <span className="eyebrow block mb-2">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-3 text-lg font-display"
              />
            </label>
            <label className="block">
              <span className="eyebrow block mb-2">Password</span>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="current-password"
                className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-3 text-lg font-display"
              />
            </label>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-paper py-4 text-[0.78rem] tracking-[0.22em] uppercase hover:opacity-80 transition disabled:opacity-50"
            >
              {loading ? "Signing in" : "Sign in"}
            </button>
          </form>

          <p className="mt-10 text-xs text-ink-soft leading-relaxed">
            Admin access is restricted to the site owner. Visitors never see this page.
          </p>
          <button
            type="button"
            onClick={resetSession}
            disabled={loading}
            className="mt-4 text-xs tracking-[0.18em] uppercase text-ink-soft underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
          >
            Reset sign-in session
          </button>
        </div>
      </main>
    </div>
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error("Request timed out")), ms);
    }),
  ]);
}
