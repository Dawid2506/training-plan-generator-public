import { Card } from "@/components/ui/card";
import { Button } from "../ui/button";
import { API_CONFIG, buildApiUrl } from "@/lib/api";
import { ChartConfig } from "../ui/chart";
import { useState, useEffect } from "react";
import ChartCard from "./content/ChartCard";

const Statistics = () => {
  const [chartData24, setChartData24] = useState<any[]>([]);
  const [chartData30Days, setChartData30Days] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const chartConfig = {
    desktop: {
      label: "totalTokens",
      color: "blue",
    },
  } satisfies ChartConfig;

  useEffect(() => {
    showData24h();
    showData30d();
  }, []);

  const showData30d = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.tokens.myUsageChart(30)),
        {
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch statistics");
      }
      const data = await response.json();
      setChartData30Days(data.data);
      console.log(`data: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };
  const showData24h = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.tokens.myUsageChart24h()),
        {
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch statistics");
      }
      const data = await response.json();
      setChartData24(data.data);
      console.log(`data: ${JSON.stringify(chartData24)}`);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="h-full w-full">
      <Card className="h-1/4 w-full">
        <Button
          onClick={showData30d}
          variant="outline"
          className="w-1/2 bg-secondary text-black hover:bg-slate-700"
          disabled={loading}
        >
          {loading ? "Loading..." : "View Statistics 30 days"}
        </Button>
        <Button
          onClick={showData24h}
          variant="outline"
          className="w-1/2 bg-secondary text-black hover:bg-slate-700"
          disabled={loading}
        >
          {loading ? "Loading..." : "View Statistics 24h"}
        </Button>
      </Card>
      <div className="flex flex-row">
        <ChartCard
          title="Token usage for the last 24 hours"
          chartData={chartData24}
          chartConfig={chartConfig}
          dataKey="totalTokens"
          xAxisDataKey="hour"
          description="Showing total token usage for the last 24 hours"
          className="mt-4 mr-2"
        />
        <ChartCard
          title="Token usage for the last 30 days"
          chartData={chartData30Days}
          chartConfig={chartConfig}
          dataKey="totalTokens"
          xAxisDataKey="date"
          description="Showing total token usage for the last 30 days"
          className="mt-4 ml-2"
        />
      </div>
    </div>
  );
};

export default Statistics;
