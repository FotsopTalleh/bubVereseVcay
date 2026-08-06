import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EventForm, type EventDraft } from "@/components/EventForm";
import { useSession } from "@/hooks/useSession";
import { api, ApiError } from "@/lib/api";
import type { EventRecord } from "@/lib/types";

export const Route = createFileRoute("/planner/edit/$eventId")({
  component: EditEvent,
});

function EditEvent() {
  const { eventId } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();

  const { data: events } = useQuery({
    queryKey: ["planner-events"],
    queryFn: () => api.get<EventRecord[]>("/planner/events"),
    enabled: session?.role === "planner",
  });
  const event = events?.find((e) => e.id === eventId);

  const updateMutation = useMutation({
    mutationFn: (draft: EventDraft) => api.patch<EventRecord>(`/events/${eventId}`, draft),
    onSuccess: () => {
      toast.success("Event updated");
      void queryClient.invalidateQueries({ queryKey: ["planner-events"] });
      void router.navigate({ to: "/planner/events" });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Could not update event."),
  });

  if (session?.role !== "planner") return null;
  if (!events) return null;
  if (!event) {
    return <p className="text-sm text-muted-foreground">This event no longer exists.</p>;
  }

  return (
    <EventForm
      organizerId={session.organizerId}
      initial={event}
      submitLabel="Save changes"
      onSubmit={(draft) => updateMutation.mutate(draft)}
    />
  );
}
