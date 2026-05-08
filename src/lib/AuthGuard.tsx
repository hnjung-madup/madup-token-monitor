import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";

type Props = { children: React.ReactNode };

export function AuthGuard({ children }: Props) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/login", { replace: true });
      }
      setChecked(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          navigate("/login", { replace: true });
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  if (!checked) return null;
  return <>{children}</>;
}
