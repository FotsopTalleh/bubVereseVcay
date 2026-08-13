import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MousePointerClick, Navigation, CalendarCheck, Share2, Link2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";
import type { EventRecord } from "@/lib/types";

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

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Interest over time</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={30} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="pinClicks"
                name="Pin clicks"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="directionClicks"
                name="Direction clicks"
                stroke="var(--chart-3)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="shareCount"
                name="Shares"
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="linkClicks"
                name="Link clicks"
                stroke="var(--chart-4)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Per-event breakdown</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={30} />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="pinClicks"
                name="Pin clicks"
                fill="var(--chart-1)"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="directionClicks"
                name="Direction clicks"
                fill="var(--chart-2)"
                radius={[6, 6, 0, 0]}
              />
              <Bar dataKey="shareCount" name="Shares" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
              <Bar
                dataKey="linkClicks"
                name="Link clicks"
                fill="var(--chart-4)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
