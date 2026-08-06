import { useEffect, useState } from "react";
import { hydrateSession, useSessionStore, type Session } from "@/lib/session";

export function useSession(): { session: Session; ready: boolean } {
  const session = useSessionStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrateSession();
    setReady(true);
  }, []);

  return { session, ready };
}
