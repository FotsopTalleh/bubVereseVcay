import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardShell, SignedOutNotice } from "@/components/DashboardShell";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console — BubVerseVacy" },
      {
        name: "description",
        content:
          "Verify organizers, moderate events and review platform-wide pin click and direction click analytics.",
      },
      { property: "og:title", content: "Admin Console — BubVerseVacy" },
      {
        property: "og:description",
        content: "Governance, verification and analytics for the BubVerseVacy event map.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Analytics" },
  { to: "/admin/organizers", label: "Organizers" },
  { to: "/admin/events", label: "Events" },
];

function AdminLayout() {
  const { session, ready } = useSession();
  if (!ready) return null;
  if (session?.role !== "admin") return <SignedOutNotice role="administrator" />;

  return (
    <DashboardShell
      title="Administration"
      subtitle="Verification, moderation and platform analytics"
      nav={NAV}
    >
      <Outlet />
    </DashboardShell>
  );
}
