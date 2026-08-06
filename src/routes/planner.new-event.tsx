import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EventForm, type EventDraft } from "@/components/EventForm";
import { useSession } from "@/hooks/useSession";
import { api, ApiError } from "@/lib/api";
import type { EventRecord } from "@/lib/types";

export const Route = createFileRoute("/planner/new-event")({
  component: NewEvent,
});

function NewEvent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();

  const createMutation = useMutation({
    mutationFn: (draft: EventDraft) => api.post<EventRecord>("/events/", draft),
    onSuccess: () => {
      toast.success("Event created");
      void queryClient.invalidateQueries({ queryKey: ["planner-events"] });
      void router.navigate({ to: "/planner/events" });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Could not create event."),
  });

  if (session?.role !== "planner") return null;

  return (
    <EventForm
      organizerId={session.organizerId}
      submitLabel="Publish event"
      onSubmit={(draft) => createMutation.mutate(draft)}
    />
  );
}
