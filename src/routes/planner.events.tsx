import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link2, MousePointerClick, Navigation, Pencil, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api";
import { formatEventDate } from "@/lib/directions";
import type { EventRecord } from "@/lib/types";

export const Route = createFileRoute("/planner/events")({
  component: PlannerEvents,
});

function PlannerEvents() {
  const queryClient = useQueryClient();
  const { data: events = [] } = useQuery({
    queryKey: ["planner-events"],
    queryFn: () => api.get<EventRecord[]>("/planner/events"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => {
      toast.success("Event deleted");
      void queryClient.invalidateQueries({ queryKey: ["planner-events"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Could not delete event."),
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
    <div className="grid gap-4 sm:grid-cols-2">
      {events.map((event) => (
        <article
          key={event.id}
          className="flex flex-col overflow-hidden rounded-2xl border bg-card"
        >
          <div className="relative">
            <img
              src={event.flyerImageUrl}
              alt=""
              loading="lazy"
              className="h-40 w-full object-cover object-top"
            />
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <div>
              <Badge
                variant={event.status === "Published" ? "default" : "secondary"}
                className="mb-2"
              >
                {event.status}
              </Badge>
              <h2 className="truncate font-medium">{event.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatEventDate(event.date)} · {event.venueName}
              </p>
              <p className="text-xs text-muted-foreground">{event.category}</p>
            </div>

            <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm">
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
              <div>
                <dt className="flex items-center gap-1 text-[10px] tracking-arch text-muted-foreground">
                  <Share2 className="h-3 w-3" aria-hidden="true" /> Shares
                </dt>
                <dd className="font-semibold tabular-nums">{event.shareCount}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-[10px] tracking-arch text-muted-foreground">
                  <Link2 className="h-3 w-3" aria-hidden="true" /> Link clicks
                </dt>
                <dd className="font-semibold tabular-nums">{event.linkClicks}</dd>
              </div>
            </dl>

            <div className="mt-auto flex gap-2 pt-1">
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link to="/planner/edit/$eventId" params={{ eventId: event.id }}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => deleteMutation.mutate(event.id)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete
              </Button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
