import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MousePointerClick, Navigation, CalendarCheck, Share2, Link2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";
import type { EventRecord } from "@/lib/types";

// Recharts is ~500kB on its own, loaded only in the browser and only after
// the stat cards above have already painted, see DashboardCharts.tsx.
const DashboardCharts = lazy(() => import("@/components/planner/DashboardCharts"));
const CHARTS_FALLBACK = (
  <>
    <div className="h-[21.5rem] w-full rounded-2xl border bg-muted/40" />
    <div className="h-[23.5rem] w-full rounded-2xl border bg-muted/40" />
  </>
);

export const Route = createFileRoute("/planner/")({
  component: PlannerOverview,
});

function PlannerOverview() {
  const { data: events = [] } = useQuery({
    queryKey: ["planner-events"],
    queryFn: () => api.get<EventRecord[]>("/planner/events"),
  });

  const totals = events.reduce(
    (acc, e) => ({
      pin: acc.pin + e.pinClicks,
      dir: acc.dir + e.directionClicks,
      share: acc.share + e.shareCount,
      link: acc.link + e.linkClicks,
    }),
    { pin: 0, dir: 0, share: 0, link: 0 },
  );

  const trend = useMemo(() => {
    const byDate = new Map<
      string,
      {
        date: string;
        pinClicks: number;
        directionClicks: number;
        shareCount: number;
        linkClicks: number;
      }
    >();
    events.forEach((e) =>
      e.history.forEach((h) => {
        const row = byDate.get(h.date) ?? {
          date: h.date,
          pinClicks: 0,
          directionClicks: 0,
          shareCount: 0,
          linkClicks: 0,
        };
        // History rows written before shareCount/linkClicks existed don't
        // have those keys at all, fall back to 0 so one old row doesn't
        // NaN-poison the running total for its date (and everything after).
        row.pinClicks += h.pinClicks ?? 0;
        row.directionClicks += h.directionClicks ?? 0;
        row.shareCount += h.shareCount ?? 0;
        row.linkClicks += h.linkClicks ?? 0;
        byDate.set(h.date, row);
      }),
    );
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  const breakdown = events.map((e) => ({
    name: e.title.length > 16 ? `${e.title.slice(0, 15)}…` : e.title,
    pinClicks: e.pinClicks,
    directionClicks: e.directionClicks,
    shareCount: e.shareCount,
    linkClicks: e.linkClicks,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Pin clicks"
          value={totals.pin}
          hint="Times your pins were opened"
          icon={<MousePointerClick className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="Direction clicks"
          value={totals.dir}
          hint="Strong intent signals"
          icon={<Navigation className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="Shares"
          value={totals.share}
          hint="Times your share link was generated"
          icon={<Share2 className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="Link clicks"
          value={totals.link}
          hint="Times a shared link was opened"
          icon={<Link2 className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="Published events"
          value={events.filter((e) => e.status === "Published").length}
          hint={`${events.length} total listings`}
          icon={<CalendarCheck className="h-4 w-4" aria-hidden="true" />}
        />
      </div>

      <ClientOnly fallback={CHARTS_FALLBACK}>
        <Suspense fallback={CHARTS_FALLBACK}>
          <DashboardCharts trend={trend} breakdown={breakdown} />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
