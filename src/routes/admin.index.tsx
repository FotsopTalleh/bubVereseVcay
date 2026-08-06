import { createFileRoute } from "@tanstack/react-router";
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
import { StatCard } from "@/components/StatCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore } from "@/lib/store";
import { ORGANIZER_STATUSES } from "@/lib/types";

export const Route = createFileRoute("/admin/")({
  component: AdminAnalytics,
});

function AdminAnalytics() {
  const events = useStore((s) => s.events);
  const organizers = useStore((s) => s.organizers);

  const totals = events.reduce(
    (acc, e) => ({ pin: acc.pin + e.pinClicks, dir: acc.dir + e.directionClicks }),
    { pin: 0, dir: 0 },
  );

  const statusData = ORGANIZER_STATUSES.map((status) => ({
    status: status.replace(" Verification", ""),
    count: organizers.filter((o) => o.status === status).length,
  }));

  const byDate = new Map<string, { date: string; pinClicks: number; directionClicks: number }>();
  events.forEach((e) =>
    e.history.forEach((h) => {
      const row = byDate.get(h.date) ?? { date: h.date, pinClicks: 0, directionClicks: 0 };
      row.pinClicks += h.pinClicks;
      row.directionClicks += h.directionClicks;
      byDate.set(h.date, row);
    }),
  );
  const trend = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  const perOrganizer = organizers
    .map((o) => {
      const owned = events.filter((e) => e.organizerId === o.id);
      return {
        id: o.id,
        name: o.name,
        status: o.status,
        events: owned.length,
        published: owned.filter((e) => e.status === "Published").length,
        pin: owned.reduce((sum, e) => sum + e.pinClicks, 0),
        dir: owned.reduce((sum, e) => sum + e.directionClicks, 0),
      };
    })
    .sort((a, b) => b.pin - a.pin);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Organizers" value={organizers.length} hint="Registered planners" />
        <StatCard
          label="Published events"
          value={events.filter((e) => e.status === "Published").length}
          hint={`${events.length} total records`}
        />
        <StatCard label="Pin clicks" value={totals.pin} hint="Platform-wide" />
        <StatCard label="Direction clicks" value={totals.dir} hint="Platform-wide" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold">Organizers by verification status</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="status" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                  width={26}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" name="Organizers" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold">Platform interest over time</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
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
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Events grouped by organizer</h2>
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Organizer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Events</TableHead>
              <TableHead className="text-right">Published</TableHead>
              <TableHead className="text-right">Pin clicks</TableHead>
              <TableHead className="text-right">Direction clicks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {perOrganizer.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-muted-foreground">{row.status}</TableCell>
                <TableCell className="text-right tabular-nums">{row.events}</TableCell>
                <TableCell className="text-right tabular-nums">{row.published}</TableCell>
                <TableCell className="text-right tabular-nums">{row.pin}</TableCell>
                <TableCell className="text-right tabular-nums">{row.dir}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
