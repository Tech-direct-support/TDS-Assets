"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";

export interface BarDatum {
  name: string;
  count: number;
  critical?: boolean;
}

export function HorizontalBarChart({ data, height }: { data: BarDatum[]; height?: number }) {
  const rowHeight = 30;
  const chartHeight = height ?? Math.max(120, data.length * rowHeight + 20);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 20, bottom: 4, left: 4 }}
        barCategoryGap={10}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#4b4b4b" }}
        />
        <Tooltip
          cursor={{ fill: "#f4f4f4" }}
          contentStyle={{
            fontSize: 12,
            border: "1px solid #e2e2e2",
            borderRadius: 3,
            boxShadow: "none",
          }}
        />
        <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={16}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.critical ? "#D6001C" : "#0A0A0A"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
