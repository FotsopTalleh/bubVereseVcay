import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
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
import { MousePointerClick, Navigation, CalendarCheck } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/planner/")({
  component: PlannerOverview,
});

function PlannerOverview() {
  const session = useStore((s) => s.session);
  const events = useStore((s) => {
    const current = s.session;
    return current?.role === "planner"
      ? s.events.filter((e) => e.organizerId === current.organizerId)
      : [];
  });

  const totals = events.reduce(
    (acc, e) => ({
      pin: acc.pin + e.pinClicks,
      dir: acc.dir + e.directionClicks,
    }),
    { pin: 0, dir: 0 },
  );

  const trend = useMemo(() => {
    const byDate = new Map<string, { date: string; pinClicks: number; directionClicks: number }>();
    events.forEach((e) =>
      e.history.forEach((h) => {
        const row = byDate.get(h.date) ?? { date: h.date, pinClicks: 0, directionClicks: 0 };
        row.pinClicks += h.pinClicks;
        row.directionClicks += h.directionClicks;
        byDate.set(h.date, row);
      }),
    );
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  const breakdown = events.map((e) => ({
    name: e.title.length > 16 ? `${e.title.slice(0, 15)}…` : e.title,
    pinClicks: e.pinClicks,
    directionClicks: e.directionClicks,
  }));

  if (session?.role !== "planner") return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
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
              <Bar dataKey="pinClicks" name="Pin clicks" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              <Bar
                dataKey="directionClicks"
                name="Direction clicks"
                fill="var(--chart-2)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
