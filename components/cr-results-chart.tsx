
"use client"
import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from "recharts"
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { CardDescription } from "./ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

const chartConfig = {
  votes: {
    label: "Votes",
  },
} satisfies import("./ui/chart").ChartConfig;

interface CrResultsChartProps {
    classResults: any[];
}

function CrResultsChartComponent({ classResults }: CrResultsChartProps) {
  if (!classResults || classResults.length === 0) {
    return (
        <div className="flex h-[150px] w-full items-center justify-center">
            <CardDescription className="text-center">No votes for CR candidates have been cast yet. <br/> Results will appear here live.</CardDescription>
        </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full" defaultValue={classResults.length > 0 ? classResults[0].classId : undefined}>
        {classResults.map((result) => (
            <AccordionItem value={result.classId} key={result.classId}>
                <AccordionTrigger className="text-lg font-medium">{result.className} Results</AccordionTrigger>
                <AccordionContent>
                    {result.chartData.length > 0 ? (
                        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                            <BarChart
                                accessibilityLayer
                                data={result.chartData}
                                layout="vertical"
                                margin={{ left: -20 }}
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
                                barSize={30}
                                />
                            </BarChart>
                        </ChartContainer>
                    ) : (
                        <p className="text-muted-foreground text-center p-4">No votes cast in this class yet.</p>
                    )}
                </AccordionContent>
            </AccordionItem>
        ))}
    </Accordion>
  )
}

export const CrResultsChart = React.memo(CrResultsChartComponent);

    