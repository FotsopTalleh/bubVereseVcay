import { Search, X } from "lucide-react";
import { CATEGORIES, type Category } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  query: string;
  onQuery: (value: string) => void;
  selected: Category[];
  onToggle: (category: Category) => void;
  onClear: () => void;
};

export function MapControls({ query, onQuery, selected, onToggle, onClear }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 space-y-2 p-3">
      <div className="pointer-events-auto surface-frost flex items-center gap-2 rounded-full px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search events by name"
          aria-label="Search events by name"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQuery("")}
            aria-label="Clear search"
            className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="pointer-events-auto -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip active={selected.length === 0} onClick={onClear} label="All" />
        {CATEGORIES.map((category) => (
          <Chip
            key={category}
            active={selected.includes(category)}
            onClick={() => onToggle(category)}
            label={category}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "surface-frost shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium shadow-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "text-foreground hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}
