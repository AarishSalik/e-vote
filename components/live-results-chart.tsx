
"use client"

import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts"

import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { CardDescription } from "./ui/card";

const chartConfig = {
  votes: {
    label: "Votes",
  },
} satisfies import("./ui/chart").ChartConfig;

interface LiveResultsChartProps {
    chartData: any[];
}

function LiveResultsChartComponent({ chartData }: LiveResultsChartProps) {
  const chartHasData = React.useMemo(() => chartData.some(d => d.votes > 0), [chartData]);
  
  if (chartData.length === 0) {
    return (
        <div className="flex h-[250px] w-full items-center justify-center">
            <CardDescription>No HR candidates added yet. Add candidates in settings to see live results.</CardDescription>
        </div>
    );
  }

  if (!chartHasData) {
     return (
        <div className="flex h-[250px] w-full items-center justify-center">
            <CardDescription className='text-center'>No votes have been cast for HR candidates yet. <br/> Results will appear here live.</CardDescription>
        </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
      <BarChart
        accessibilityLayer
        data={chartData}
        layout="vertical"
        margin={{
          left: -20,
        }}
      >
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="name"
          type="category"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tick={{ fill: "hsl(var(--foreground))" }}
          className="text-xs"
          width={120}
        />
        <XAxis dataKey="votes" type="number" hide />
        <RechartsTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Bar
          dataKey="votes"
          layout="vertical"
          radius={5}
          barSize={40}
        />
      </BarChart>
    </ChartContainer>
  )
}

export const LiveResultsChart = React.memo(LiveResultsChartComponent);


    