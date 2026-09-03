import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SignedOutNotice } from "@/components/DashboardShell";
import { PlannerShell } from "@/components/PlannerShell";
import { useSession } from "@/hooks/useSession";
import { api } from "@/lib/api";
import type { Organizer } from "@/lib/types";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Planner Dashboard, BubVerseVacy" },
      {
        name: "description",
        content:
          "Publish events to the map, manage your listings and track pin clicks and direction clicks over time.",
      },
      { property: "og:title", content: "Planner Dashboard, BubVerseVacy" },
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

function PlannerLayout() {
  const { session, ready } = useSession();
  const isPlanner = session?.role === "planner";

  const { data: organizer } = useQuery({
    queryKey: ["planner-profile"],
    queryFn: () => api.get<Organizer>("/planner/profile"),
    enabled: ready && isPlanner,
  });

  if (!ready) return null;
  if (!isPlanner) return <SignedOutNotice role="planner" />;

  // Deliberately doesn't wait on `organizer` before rendering Outlet: the
  // child route's own data (e.g. planner/events) doesn't depend on it, and
  // gating the whole shell on this fetch serialized two backend round trips
  // (profile, then events) that should run in parallel. InitialsAvatar
  // handles an undefined name until the profile fetch resolves.
  return (
    <PlannerShell organizerName={organizer?.name}>
      <Outlet />
    </PlannerShell>
  );
}
