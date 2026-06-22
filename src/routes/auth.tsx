import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Varun Nagalla" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        setInfo("Account created. You can sign in now.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <header className="mx-auto max-w-[1400px] w-full px-6 md:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="font-display text-xl">Varun Nagalla</Link>
        <Link to="/" className="text-[0.78rem] tracking-[0.22em] uppercase text-ink-soft hover:text-ink">
          ← Back to site
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <p className="eyebrow mb-4">Studio access</p>
          <h1 className="font-display text-5xl mb-10 leading-[1]">
            {mode === "signin" ? "Sign in" : "Create the admin account"}
          </h1>

          <form onSubmit={submit} className="space-y-5">
            <label className="block">
              <span className="eyebrow block mb-2">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-3 text-lg font-display"
              />
            </label>
            <label className="block">
              <span className="eyebrow block mb-2">Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-3 text-lg font-display"
              />
            </label>

            {error && <p className="text-sm text-red-700">{error}</p>}
            {info && <p className="text-sm text-ink-soft">{info}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-paper py-4 text-[0.78rem] tracking-[0.22em] uppercase hover:opacity-80 transition disabled:opacity-50"
            >
              {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setInfo(null); }}
            className="mt-6 text-xs tracking-[0.22em] uppercase text-ink-soft hover:text-ink"
          >
            {mode === "signin"
              ? "First time? Create the admin account →"
              : "Already have an account? Sign in →"}
          </button>

          <p className="mt-10 text-xs text-ink-soft leading-relaxed">
            The first account created automatically becomes the site administrator. Visitors never see this page.
          </p>
        </div>
      </main>
    </div>
  );
}
