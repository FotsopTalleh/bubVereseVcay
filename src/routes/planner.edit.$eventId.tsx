import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { EventForm } from "@/components/EventForm";
import { updateEvent, useStore } from "@/lib/store";

export const Route = createFileRoute("/planner/edit/$eventId")({
  component: EditEvent,
});

function EditEvent() {
  const { eventId } = Route.useParams();
  const router = useRouter();
  const session = useStore((s) => s.session);
  const event = useStore((s) => s.events.find((e) => e.id === eventId));

  if (session?.role !== "planner") return null;
  if (!event) {
    return <p className="text-sm text-muted-foreground">This event no longer exists.</p>;
  }

  return (
    <EventForm
      organizerId={session.organizerId}
      initial={event}
      submitLabel="Save changes"
      onSubmit={(draft) => {
        updateEvent(event.id, draft);
        toast.success("Event updated");
        void router.navigate({ to: "/planner/events" });
      }}
    />
  );
}
