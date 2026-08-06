import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardShell, SignedOutNotice } from "@/components/DashboardShell";
import { useSession } from "@/hooks/useSession";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Planner Dashboard — BubVerseVacy" },
      {
        name: "description",
        content:
          "Publish events to the map, manage your listings and track pin clicks and direction clicks over time.",
      },
      { property: "og:title", content: "Planner Dashboard — BubVerseVacy" },
      {
        property: "og:description",
        content: "Manage your events and measure pre-event interest.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlannerLayout,
});

const NAV = [
  { to: "/planner", label: "Overview" },
  { to: "/planner/events", label: "My events" },
  { to: "/planner/new-event", label: "New event" },
  { to: "/planner/profile", label: "Profile" },
];

function PlannerLayout() {
  const { session, ready } = useSession();
  const organizer = useStore((s) =>
    session?.role === "planner" ? s.organizers.find((o) => o.id === session.organizerId) : undefined,
  );

  if (!ready) return null;
  if (session?.role !== "planner" || !organizer) return <SignedOutNotice role="planner" />;

  return (
    <DashboardShell
      title={organizer.name}
      subtitle={`Verification status: ${organizer.status}`}
      nav={NAV}
    >
      <Outlet />
    </DashboardShell>
  );
}
