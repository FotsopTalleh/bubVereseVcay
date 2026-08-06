import { Link } from "@tanstack/react-router";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      <span className="text-foreground">BubVerse</span>
      <span className="font-normal text-primary">Vacy</span>
    </span>
  );
}

export function OneTouchMark({ className = "" }: { className?: string }) {
  return (
    <img
      src="/onetouch-mark.png"
      alt=""
      aria-hidden="true"
      className={`rounded-full object-cover ${className}`}
    />
  );
}

export function PoweredBy({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://onetouch.technology"
      target="_blank"
      rel="noreferrer noopener"
      className={`inline-flex items-center gap-1.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground ${className}`}
    >
      <OneTouchMark className="h-3.5 w-3.5 text-primary" />
      <span className="tracking-arch">Powered by One Touch Technologies</span>
    </a>
  );
}

export function DashboardFooter({ showBackToMap = true }: { showBackToMap?: boolean }) {
  return (
    <footer className="mt-12 flex flex-col items-center gap-2 border-t py-6 text-center">
      <PoweredBy />
      {showBackToMap && (
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
          Back to the public map
        </Link>
      )}
    </footer>
  );
}
