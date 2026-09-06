import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import { formatCompactNumber } from "@/lib/format";

export interface UsagePoint {
  [key: string]: unknown;
  totalTokens?: number;
}

interface UsageChartProps {
  data: UsagePoint[];
  xKey: string;
  isLoading?: boolean;
}

function UsageTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-2.5 py-2 text-[12.5px] shadow-lg shadow-black/20">
      <p className="mb-0.5 text-muted-foreground">{label}</p>
      <p className="tnum font-medium">
        {Number(payload[0]?.value ?? 0).toLocaleString()} tokens
      </p>
    </div>
  );
}

export function UsageChart({ data, xKey, isLoading }: UsageChartProps) {
  if (isLoading) {
    return <Skeleton className="h-52 w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-[13px] text-muted-foreground">
        No usage recorded for this period.
      </div>
    );
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            interval="preserveStartEnd"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(value: string) => String(value).slice(0, 5)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(value: number) => formatCompactNumber(value)}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)" }}
            content={<UsageTooltip />}
          />
          <Bar dataKey="totalTokens" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={38} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
