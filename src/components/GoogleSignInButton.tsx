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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!CLIENT_ID) return;

    function render() {
      if (!containerRef.current || !wrapperRef.current || !window.google) return;
      // Google's button is a fixed-width iframe — size it to the wrapper so
      // it doesn't overflow the card on narrow phones (Google caps at 400).
      const width = Math.min(
        400,
        Math.max(220, Math.round(wrapperRef.current.getBoundingClientRect().width)),
      );
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID!,
        callback: (response) => onCredentialRef.current(response.credential),
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        width,
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

  return (
    <div className="flex justify-center">
      {/* Gradient ring in the brand colors — Google's iframe controls its own
       * corners/fill, so the "pill" shape above plus this wrapper is how we
       * make an otherwise-static Google button feel native to the page. */}
      <div
        ref={wrapperRef}
        className="w-full max-w-[360px] rounded-full p-[1.5px] shadow-md shadow-black/10 transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/25"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div
          ref={containerRef}
          className="flex justify-center overflow-hidden rounded-full bg-background"
        />
      </div>
    </div>
  );
}
