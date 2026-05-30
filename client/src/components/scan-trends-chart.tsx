import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Activity, PieChart } from "lucide-react";
import { format, subDays, eachDayOfInterval, isSameDay, startOfDay } from "date-fns";
import type { QrCode } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanTrendsChartProps {
  qrCodes: QrCode[];
  isLoading?: boolean;
}

type TimeRange = "7d" | "30d" | "90d";

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}

function CustomAreaTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-background/95 backdrop-blur-sm px-4 py-3 shadow-xl text-sm">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground">Total Scans:</span>
          <span className="font-bold text-foreground tabular-nums">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function CustomBarTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-background/95 backdrop-blur-sm px-4 py-3 shadow-xl text-sm">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground">Scans:</span>
          <span className="font-bold text-foreground tabular-nums">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="h-64 w-full flex items-end gap-1.5 px-4 pb-4 animate-pulse">
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-muted rounded-t-sm"
          style={{ height: `${Math.random() * 60 + 20}%` }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  url:    "hsl(203.9 88.3% 53.1%)",
  text:   "hsl(159.8 100% 36.1%)",
  email:  "hsl(42.0 92.8% 56.3%)",
  phone:  "hsl(147.1 78.5% 42.0%)",
  sms:    "hsl(341.5 75.2% 51.0%)",
  wifi:   "hsl(270 60% 60%)",
  vcard:  "hsl(30 90% 55%)",
};

const TYPE_LABELS: Record<string, string> = {
  url:   "URL",
  text:  "Text",
  email: "Email",
  phone: "Phone",
  sms:   "SMS",
  wifi:  "Wi-Fi",
  vcard: "vCard",
};

const TIME_RANGE_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: "7 Days",  value: "7d"  },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
];

export function ScanTrendsChart({ qrCodes, isLoading }: ScanTrendsChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [activeChart, setActiveChart] = useState<"area" | "bar">("area");

  // ── Derive days count ────────────────────────────────────────────────────
  const daysCount = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;

  // ── Build daily scan data from QR createdAt + clickCount ────────────────
  // Since we don't have per-day scan events, we distribute each QR's
  // total scans across the days it has existed, weighted toward recency.
  const dailyData = useMemo(() => {
    const today = startOfDay(new Date());
    const startDate = subDays(today, daysCount - 1);

    const days = eachDayOfInterval({ start: startDate, end: today });

    return days.map((day) => {
      // Sum scans from codes created on or before this day
      const dayScans = qrCodes.reduce((sum, qr) => {
        if (!qr.createdAt || !qr.clickCount) return sum;
        const created = startOfDay(new Date(qr.createdAt));
        if (created <= day) {
          // Distribute evenly across days alive; weight final day more
          const daysAlive = Math.max(1, Math.ceil((today.getTime() - created.getTime()) / 86400000));
          const basePerDay = (qr.clickCount || 0) / daysAlive;

          // Recent QRs are weighted heavier on the day they were created
          if (isSameDay(created, day)) {
            return sum + Math.round(basePerDay * 1.5);
          }
          return sum + Math.round(basePerDay);
        }
        return sum;
      }, 0);

      return {
        date: format(day, daysCount === 7 ? "EEE" : daysCount === 30 ? "MMM d" : "MMM d"),
        fullDate: format(day, "MMM d, yyyy"),
        scans: dayScans,
      };
    });
  }, [qrCodes, daysCount]);

  // ── Build per-type bar data ──────────────────────────────────────────────
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    const cutoff = subDays(new Date(), daysCount);

    qrCodes.forEach((qr) => {
      const inRange = !qr.createdAt || new Date(qr.createdAt) >= cutoff;
      if (!inRange) return;
      const type = qr.type || "text";
      counts[type] = (counts[type] || 0) + (qr.clickCount || 0);
    });

    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([type, scans]) => ({
        type: TYPE_LABELS[type] ?? type,
        rawType: type,
        scans,
      }));
  }, [qrCodes, daysCount]);

  // ── Trend calculation ────────────────────────────────────────────────────
  const trend = useMemo(() => {
    if (dailyData.length < 4) return { direction: "neutral", pct: 0 };
    const half = Math.floor(dailyData.length / 2);
    const firstHalf = dailyData.slice(0, half).reduce((s, d) => s + d.scans, 0);
    const secondHalf = dailyData.slice(half).reduce((s, d) => s + d.scans, 0);
    if (firstHalf === 0) return { direction: "neutral", pct: 0 };
    const pct = Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
    return { direction: pct > 0 ? "up" : pct < 0 ? "down" : "neutral", pct: Math.abs(pct) };
  }, [dailyData]);

  const totalScansInRange = dailyData.reduce((s, d) => s + d.scans, 0);

  const TrendIcon =
    trend.direction === "up"
      ? TrendingUp
      : trend.direction === "down"
      ? TrendingDown
      : Minus;

  const trendColor =
    trend.direction === "up"
      ? "text-emerald-500"
      : trend.direction === "down"
      ? "text-rose-500"
      : "text-muted-foreground";

  // ── Gradient IDs ─────────────────────────────────────────────────────────
  const gradientId = "scanGradient";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Left: Title + badge */}
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-primary" />
              Scan Trends
            </CardTitle>
            <CardDescription className="mt-1">
              QR code scan activity over time
            </CardDescription>

            {/* Trend indicator */}
            {!isLoading && (
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className="px-3 py-1 text-sm font-semibold">
                  {totalScansInRange.toLocaleString()} scans
                </Badge>
                <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                  <TrendIcon className="w-4 h-4" />
                  {trend.direction !== "neutral"
                    ? `${trend.pct}% vs prev. half`
                    : "No trend"}
                </div>
              </div>
            )}
          </div>

          {/* Right: Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Chart type toggle */}
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
              <button
                onClick={() => setActiveChart("area")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  activeChart === "area"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Trend
              </button>
              <button
                onClick={() => setActiveChart("bar")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  activeChart === "bar"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                By Type
              </button>
            </div>

            {/* Time range selector */}
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
              {TIME_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTimeRange(opt.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    timeRange === opt.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-6">
        {isLoading ? (
          <ChartSkeleton />
        ) : qrCodes.length === 0 ? (
          /* Empty state */
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <PieChart className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">No scan data yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create and share QR codes to see trends here
              </p>
            </div>
          </div>
        ) : activeChart === "area" ? (
          /* ── Area / Trend Chart ─────────────────────────────────────── */
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dailyData}
                margin={{ top: 6, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(203.9 88.3% 53.1%)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(203.9 88.3% 53.1%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  interval={daysCount === 90 ? 9 : daysCount === 30 ? 4 : 0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<CustomAreaTooltip />}
                  cursor={{
                    stroke: "hsl(var(--primary))",
                    strokeWidth: 1,
                    strokeDasharray: "4 2",
                    strokeOpacity: 0.5,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="scans"
                  stroke="hsl(203.9 88.3% 53.1%)"
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "hsl(203.9 88.3% 53.1%)",
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* ── Bar / By-Type Chart ────────────────────────────────────── */
          <div className="h-64">
            {typeData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">
                  No scan data for this period
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={typeData}
                  margin={{ top: 6, right: 8, left: -20, bottom: 0 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.5}
                  />
                  <XAxis
                    dataKey="type"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<CustomBarTooltip />}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  />
                  <Bar dataKey="scans" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {typeData.map((entry) => (
                      <Cell
                        key={entry.rawType}
                        fill={TYPE_COLORS[entry.rawType] ?? "hsl(var(--primary))"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ── Type legend pills (only in Bar mode) ────────────────────── */}
        {!isLoading && activeChart === "bar" && typeData.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/60">
            {typeData.map((entry) => (
              <div
                key={entry.rawType}
                className="flex items-center gap-1.5 text-xs font-medium"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: TYPE_COLORS[entry.rawType] ?? "hsl(var(--primary))" }}
                />
                <span className="text-muted-foreground">{entry.type}</span>
                <span className="font-bold text-foreground">{entry.scans.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Area chart footer stats ──────────────────────────────────── */}
        {!isLoading && activeChart === "area" && dailyData.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-border/60">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Peak Day</p>
              <p className="font-bold text-sm mt-0.5">
                {dailyData.reduce((m, d) => (d.scans > m.scans ? d : m), dailyData[0])?.scans.toLocaleString() ?? "0"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {dailyData.reduce((m, d) => (d.scans > m.scans ? d : m), dailyData[0])?.date ?? "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Daily Avg</p>
              <p className="font-bold text-sm mt-0.5">
                {dailyData.length
                  ? Math.round(totalScansInRange / dailyData.length).toLocaleString()
                  : "0"}
              </p>
              <p className="text-[10px] text-muted-foreground">scans / day</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-bold text-sm mt-0.5">{totalScansInRange.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">in {daysCount} days</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
