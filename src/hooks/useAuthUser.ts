import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  slackHandle: string | null;
}

function deriveUser(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null): AuthUser | null {
  if (!u) return null;
  const meta = u.user_metadata ?? {};
  const name =
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    (u.email ? u.email.split("@")[0] : "");
  const avatarUrl =
    (meta.avatar_url as string | undefined) ??
    (meta.picture as string | undefined) ??
    null;
  const slackHandle =
    (meta.slack_handle as string | undefined) ??
    (meta.user_name as string | undefined) ??
    null;
  return {
    id: u.id,
    email: u.email ?? "",
    name,
    avatarUrl,
    slackHandle,
  };
}

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(deriveUser(data.user));
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(deriveUser(session?.user ?? null));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loading };
}
