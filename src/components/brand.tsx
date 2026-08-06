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
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path
        d="M6.6 6.6a7.5 7.5 0 0 0 0 10.8M17.4 6.6a7.5 7.5 0 0 1 0 10.8M3.4 3.4a12 12 0 0 0 0 17.2M20.6 3.4a12 12 0 0 1 0 17.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
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

export function DashboardFooter() {
  return (
    <footer className="mt-12 flex flex-col items-center gap-2 border-t py-6 text-center">
      <PoweredBy />
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
        Back to the public map
      </Link>
    </footer>
  );
}
