
"use client";
import React from 'react';
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Bar, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { Candidate } from "@/lib/types";
import { CardDescription } from "./ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

const chartConfig = {
  votes: {
    label: "Votes",
  },
} satisfies import("./ui/chart").ChartConfig;

interface HrResultsByClassChartProps {
    resultsByClass: any[];
    hrCandidates: Candidate[];
}

function HrResultsByClassChartComponent({ resultsByClass, hrCandidates }: HrResultsByClassChartProps) {
  if (hrCandidates.length === 0) {
    return (
        <div className="flex h-[150px] w-full items-center justify-center">
            <CardDescription className="text-center">No HR candidates have been added yet.</CardDescription>
        </div>
    );
  }
  
  if (!resultsByClass || resultsByClass.length === 0) {
     return (
        <div className="flex h-[150px] w-full items-center justify-center">
            <CardDescription className="text-center">No HR votes have been cast yet. <br/> Results will appear here live.</CardDescription>
        </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full" defaultValue={resultsByClass.length > 0 ? resultsByClass[0].classId : undefined}>
      {resultsByClass.map((result) => (
        <AccordionItem value={result.classId} key={result.classId}>
          <AccordionTrigger className="text-lg font-medium">{result.className} ({result.totalVotes} Votes)</AccordionTrigger>
          <AccordionContent>
            <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
              <BarChart data={result.chartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid horizontal={false} />
                <YAxis dataKey="house" type="category" tickLine={false} axisLine={false} tickMargin={10} />
                <XAxis dataKey="votes" type="number" hide />
                <RechartsTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                <Bar dataKey="votes" radius={5} barSize={40}>
                    {result.chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                    ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export const HrResultsByClassChart = React.memo(HrResultsByClassChartComponent);

    