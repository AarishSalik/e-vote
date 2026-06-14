
"use client"

import * as React from "react"
import { Pie, PieChart, Cell } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { CardDescription } from "./ui/card";

const chartConfig = {
  // Config will be generated dynamically based on props
} satisfies import("./ui/chart").ChartConfig;

interface TurnoutByHouseChartProps {
    chartData: any[];
}

function TurnoutByHouseChartComponent({ chartData }: TurnoutByHouseChartProps) {
    const totalVotes = React.useMemo(() => chartData.reduce((acc, curr) => acc + curr.votes, 0), [chartData]);

    const dynamicChartConfig = React.useMemo(() => {
        return chartData.reduce((acc, entry) => {
            acc[entry.house.toLowerCase()] = {
                label: entry.house,
                color: entry.fill,
            };
            return acc;
        }, {} as import("./ui/chart").ChartConfig);
    }, [chartData]);
    
    if (totalVotes === 0) {
        return (
            <div className="flex h-[300px] w-full items-center justify-center">
                <CardDescription className="text-center">No votes have been cast yet. <br/>Vote data will appear here.</CardDescription>
            </div>
        );
    }

  return (
    <ChartContainer
      config={dynamicChartConfig}
      className="mx-auto aspect-square max-h-[300px]"
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={chartData}
          dataKey="votes"
          nameKey="house"
          innerRadius={60}
          strokeWidth={5}
        >
            {chartData.map((entry) => (
                <Cell key={`cell-${entry.house}`} fill={entry.fill} />
            ))}
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="house" />}
          className="-mt-2"
        />
      </PieChart>
    </ChartContainer>
  )
}

export const TurnoutByHouseChart = React.memo(TurnoutByHouseChartComponent);

    