import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { EventForm } from "@/components/EventForm";
import { createEvent, useStore } from "@/lib/store";

export const Route = createFileRoute("/planner/new-event")({
  component: NewEvent,
});

function NewEvent() {
  const router = useRouter();
  const session = useStore((s) => s.session);
  if (session?.role !== "planner") return null;

  return (
    <EventForm
      organizerId={session.organizerId}
      submitLabel="Publish event"
      onSubmit={(draft) => {
        createEvent(draft);
        toast.success("Event created");
        void router.navigate({ to: "/planner/events" });
      }}
    />
  );
}
