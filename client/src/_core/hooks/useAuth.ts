import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export function useAuth() {
  const me = trpc.auth.me.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      void utils.auth.me.invalidate();
      window.location.href = "/login";
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me.isLoading) setLoading(false);
  }, [me.isLoading]);

  if (me.isLoading) return { user: null, loading: true, isAuthenticated: false, logout };

  return { user: me.data ?? null, loading, isAuthenticated: Boolean(me.data), logout };
}
