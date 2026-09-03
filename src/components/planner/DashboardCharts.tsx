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

type TrendRow = {
  date: string;
  pinClicks: number;
  directionClicks: number;
  shareCount: number;
  linkClicks: number;
};

type BreakdownRow = {
  name: string;
  pinClicks: number;
  directionClicks: number;
  shareCount: number;
  linkClicks: number;
};

/** Recharts alone is ~500kB, heavier than every other dependency in the app
 * (including the Leaflet map). Kept in its own chunk, loaded lazily from
 * PlannerOverview, so the stat cards paint immediately on slow connections
 * instead of blocking on this download first. */
export default function DashboardCharts({
  trend,
  breakdown,
}: {
  trend: TrendRow[];
  breakdown: BreakdownRow[];
}) {
  return (
    <>
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
    </>
  );
}
