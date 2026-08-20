import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, CartesianGrid, XAxis, Bar } from "recharts";

interface ChartCardProps {
  title?: string;
  chartData: Record<string, unknown>[];
  chartConfig: ChartConfig;
  dataKey: string;
  xAxisDataKey: string;
  description?: string;
  className?: string;
}

const ChartCard = ({
  title = "Title",
  chartData,
  chartConfig,
  dataKey,
  xAxisDataKey,
  description = "",
  className = "",
}: ChartCardProps) => {
  return (
    <div className="h-full w-full text-white">
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={xAxisDataKey}
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey={dataKey} fill="var(--secondary)" radius={8} />
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">
            {description}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ChartCard;
