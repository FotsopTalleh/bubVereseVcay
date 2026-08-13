import { createFileRoute } from "@tanstack/react-router";
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
import { StatCard } from "@/components/StatCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { ORGANIZER_STATUSES, type OrganizerStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/")({
  component: AdminAnalytics,
});

type Analytics = {
  organizerCount: number;
  organizersByStatus: Record<OrganizerStatus, number>;
  publishedEvents: number;
  totalEvents: number;
  totals: { pinClicks: number; directionClicks: number; shareCount: number; linkClicks: number };
  trend: {
    date: string;
    pinClicks: number;
    directionClicks: number;
    shareCount: number;
    linkClicks: number;
  }[];
  perOrganizer: {
    id: string;
    name: string;
    status: OrganizerStatus;
    events: number;
    published: number;
    pin: number;
    dir: number;
    share: number;
    link: number;
  }[];
};

function AdminAnalytics() {
  const { data } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => api.get<Analytics>("/admin/analytics"),
  });

  if (!data) return null;

  const statusData = ORGANIZER_STATUSES.map((status) => ({
    status: status.replace(" Verification", ""),
    count: data.organizersByStatus[status] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Organizers" value={data.organizerCount} hint="Registered planners" />
        <StatCard
          label="Published events"
          value={data.publishedEvents}
          hint={`${data.totalEvents} total records`}
        />
        <StatCard label="Pin clicks" value={data.totals.pinClicks} hint="Platform-wide" />
        <StatCard
          label="Direction clicks"
          value={data.totals.directionClicks}
          hint="Platform-wide"
        />
        <StatCard label="Shares" value={data.totals.shareCount} hint="Platform-wide" />
        <StatCard label="Link clicks" value={data.totals.linkClicks} hint="Platform-wide" />
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
                <Bar
                  dataKey="count"
                  name="Organizers"
                  fill="var(--chart-3)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold">Platform interest over time</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend}>
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
                <Line
                  type="monotone"
                  dataKey="shareCount"
                  name="Shares"
                  stroke="var(--chart-3)"
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
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Link clicks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.perOrganizer.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-muted-foreground">{row.status}</TableCell>
                <TableCell className="text-right tabular-nums">{row.events}</TableCell>
                <TableCell className="text-right tabular-nums">{row.published}</TableCell>
                <TableCell className="text-right tabular-nums">{row.pin}</TableCell>
                <TableCell className="text-right tabular-nums">{row.dir}</TableCell>
                <TableCell className="text-right tabular-nums">{row.share}</TableCell>
                <TableCell className="text-right tabular-nums">{row.link}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
