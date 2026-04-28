import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; session: Session; isAdmin: boolean };

/**
 * Subscribe to auth state + admin role. Mirrors the recommended pattern:
 * onAuthStateChange listener registered BEFORE getSession.
 */
export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let mounted = true;

    const resolve = async (session: Session | null) => {
      if (!mounted) return;
      if (!session) {
        setState({ status: "unauthenticated" });
        return;
      }
      // Defer the role check so we never block the auth callback.
      setTimeout(async () => {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (!mounted) return;
        setState({
          status: "authenticated",
          session,
          isAdmin: !error && !!data,
        });
      }, 0);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolve(session);
    });
    void supabase.auth.getSession().then(({ data }) => resolve(data.session));

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

/** Redirects non-admins away from /admin pages. */
export function useAdminGuard(redirectTo = "/admin") {
  const auth = useAuthState();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.status === "unauthenticated") {
      navigate(redirectTo, { replace: true });
    }
  }, [auth.status, navigate, redirectTo]);

  return auth;
}

export async function signOut() {
  await supabase.auth.signOut();
}
