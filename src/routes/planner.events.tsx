import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { MousePointerClick, Navigation, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteEvent, useStore } from "@/lib/store";
import { formatEventDate } from "@/lib/directions";

export const Route = createFileRoute("/planner/events")({
  component: PlannerEvents,
});

function PlannerEvents() {
  const events = useStore((s) => {
    const current = s.session;
    return current?.role === "planner"
      ? s.events.filter((e) => e.organizerId === current.organizerId)
      : [];
  });

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">You haven't published any events yet.</p>
        <Button asChild className="mt-4">
          <Link to="/planner/new-event">Create your first event</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <article
          key={event.id}
          className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4"
        >
          <img
            src={event.image}
            alt=""
            loading="lazy"
            className="h-20 w-16 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-medium">{event.title}</h2>
              <Badge variant={event.status === "Published" ? "default" : "secondary"}>
                {event.status}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatEventDate(event.date)} · {event.venueName} · {event.category}
            </p>
          </div>
          <dl className="flex gap-5 text-sm">
            <div>
              <dt className="flex items-center gap-1 text-[10px] tracking-arch text-muted-foreground">
                <MousePointerClick className="h-3 w-3" aria-hidden="true" /> Pin
              </dt>
              <dd className="font-semibold tabular-nums">{event.pinClicks}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-[10px] tracking-arch text-muted-foreground">
                <Navigation className="h-3 w-3" aria-hidden="true" /> Directions
              </dt>
              <dd className="font-semibold tabular-nums">{event.directionClicks}</dd>
            </div>
          </dl>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/planner/edit/$eventId" params={{ eventId: event.id }}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                deleteEvent(event.id);
                toast.success("Event deleted");
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
