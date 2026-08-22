import { useEffect, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { recordShare } from "@/lib/directions";
import {
  canUseNativeShare,
  copyShareLink,
  socialShareLinks,
  tryNativeShare,
  type ShareableEvent,
} from "@/lib/share";

type Props = {
  event: ShareableEvent;
  /** "icon" for a compact square button (map card), "full" for a labeled
   * button that fills available width (list view / bottom bars). */
  variant?: "icon" | "full";
  className?: string;
};

export function ShareButton({ event, variant = "icon", className }: Props) {
  // Starts false so the server render and the first client render match ,
  // `navigator` doesn't exist during SSR. Flips true after mount if the
  // browser actually supports the native share sheet, which just triggers a
  // harmless post-hydration re-render rather than a mismatch.
  const [nativeShare, setNativeShare] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setNativeShare(canUseNativeShare());
  }, []);

  const icon = <Share2 className="h-4 w-4" aria-hidden="true" />;
  const label = variant === "full" ? "Share" : null;
  const size = variant === "icon" ? "icon" : "default";

  if (nativeShare) {
    return (
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => void tryNativeShare(event)}
        aria-label="Share event"
        className={className}
      >
        {icon}
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
          aria-label="Share event"
          className={className}
        >
          {icon}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            void (async () => {
              const ok = await copyShareLink(event);
              toast[ok ? "success" : "error"](ok ? "Link copied" : "Couldn't copy the link.");
            })();
          }}
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copy link
        </DropdownMenuItem>
        {socialShareLinks(event).map((s) => (
          <DropdownMenuItem key={s.name} asChild>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => void recordShare(event.id)}
              className="cursor-pointer"
            >
              {s.name}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
