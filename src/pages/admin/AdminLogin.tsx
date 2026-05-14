// Last updated: 2026-05-13
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthState } from "@/lib/auth";
import { toast } from "sonner";

export const AdminLoginPage = () => {
  const navigate = useNavigate();
  const auth = useAuthState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Redirect to dashboard once admin
  useEffect(() => {
    if (auth.status === "authenticated" && auth.isAdmin) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [auth, navigate]);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  const handleGoogle = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/admin" },
    });
    if (error) {
      setBusy(false);
      toast.error("Google sign-in failed");
    }
    // On success Supabase redirects the browser — no setBusy(false) needed
  };

  return (
    <SiteLayout>
      <section className="container-dmvt py-20">
        <div className="mx-auto max-w-md border border-hairline bg-card p-8">
          <h1 className="mb-2 font-display text-3xl font-black text-navy">Admin Sign In</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Restricted area. Existing admins only.
          </p>

          {auth.status === "authenticated" && !auth.isAdmin && (
            <div className="mb-6 border border-hairline bg-cream-mid p-4 text-sm">
              <p className="mb-3">
                Signed in as <strong>{auth.session.user.email}</strong> but you are not an admin.
              </p>
              <p className="text-xs text-muted-foreground">
                First admin setup now runs from the Supabase SQL editor or another privileged
                server-side session. Use the README bootstrap step, then sign in again here.
              </p>
              <Button
                type="button"
                variant="ghost"
                className="mt-4 w-full"
                onClick={() => supabase.auth.signOut()}
              >
                Sign out
              </Button>
            </div>
          )}

          {auth.status !== "authenticated" && (
            <>
              <form onSubmit={handlePassword} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  Sign in
                </Button>
              </form>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-hairline" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-hairline" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogle}
                disabled={busy}
              >
                Continue with Google
              </Button>
            </>
          )}
        </div>
      </section>
    </SiteLayout>
  );
};

export default AdminLoginPage;
