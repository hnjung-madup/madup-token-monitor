import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "./supabase";

type Props = { children: React.ReactNode };

type AuthCheckState = "loading" | "authed" | "unauthed";

/// 인증 상태 결정 전엔 null 을 렌더 → children 이 unauthed 상태에서 잠깐도 노출되지 않음.
/// imperative navigate 대신 declarative <Navigate> 컴포넌트를 써서 렌더 사이클 한 번에 결정.
export function AuthGuard({ children }: Props) {
  const [state, setState] = useState<AuthCheckState>("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState(data.session ? "authed" : "unauthed");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? "authed" : "unauthed");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (state === "loading") return null;
  if (state === "unauthed") return <Navigate to="/login" replace />;
  return <>{children}</>;
}
