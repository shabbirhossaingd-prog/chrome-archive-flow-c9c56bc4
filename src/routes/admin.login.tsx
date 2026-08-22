import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AuthShell,
  AuthSubmit,
  authField,
  authLabel,
} from "@/components/admin/AuthShell";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Studio Access — ZZERKOFF" },
      { name: "description", content: "Private studio sign-in for the ZZERKOFF team." },
      { property: "og:title", content: "Studio Access — ZZERKOFF" },
      { property: "og:description", content: "Private studio sign-in for the ZZERKOFF team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Enter your password").max(200),
});

function AdminLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) {
      toast.error("Incorrect email or password.");
      return;
    }
    await supabase.auth.getSession();
    queryClient.removeQueries({ queryKey: ["admin-access"] });
    navigate({ to: "/admin", replace: true });
  };

  return (
    <AuthShell label="PRIVATE / STUDIO ONLY" title="STUDIO ACCESS">
      <form onSubmit={submit} className="space-y-6">
        <div>
          <span className={authLabel}>Email</span>
          <input
            className={authField}
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="STUDIO@ZZERKOFF"
          />
        </div>
        <div>
          <span className={authLabel}>Password</span>
          <div className="relative">
            <input
              className={`${authField} pr-14`}
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
            <button
              type="button"
              aria-label={show ? "Hide password" : "Show password"}
              onClick={() => setShow(!show)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        <AuthSubmit disabled={busy}>{busy ? "Signing in…" : "Sign in"}</AuthSubmit>
        <Link
          to="/admin/forgot-password"
          className="block text-center text-[9px] uppercase tracking-[0.4em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Forgot password?
        </Link>
      </form>
    </AuthShell>
  );
}
