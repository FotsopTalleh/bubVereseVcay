import { useEffect, useState } from "react";
import { hydrateStore, useStore } from "@/lib/store";
import type { Session } from "@/lib/types";

/** Client-side session hook for the prototype (no server auth yet). */
export function useSession() {
  const session = useStore((s) => s.session);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrateStore();
    setReady(true);
  }, []);

  return { session: session as Session, ready };
}
