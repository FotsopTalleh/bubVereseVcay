import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const CLIENT_ID = import.meta.env["VITE_GOOGLE_CLIENT_ID"] as string | undefined;

/** Whether a Google Client ID is actually configured — callers should hide
 * any "or continue with Google" framing (dividers, etc.) when this is false,
 * rather than showing it above an empty space. */
export const GOOGLE_SIGN_IN_ENABLED = !!CLIENT_ID;

/** Renders Google's own "Sign in with Google" button and hands the resulting
 * ID token up — the backend verifies it, no client secret involved. Renders
 * nothing if no Client ID is configured, rather than showing a broken button. */
export function GoogleSignInButton({ onCredential }: { onCredential: (idToken: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!CLIENT_ID) return;

    function render() {
      if (!containerRef.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID!,
        callback: (response) => onCredentialRef.current(response.credential),
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        width: 360,
        text: "continue_with",
      });
    }

    if (window.google) {
      render();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);
  }, []);

  if (!CLIENT_ID) return null;

  return <div ref={containerRef} className="flex justify-center" />;
}
