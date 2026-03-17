"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ChartArtifact } from "@nodelabz/shared-types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const DEFAULT_COLORS = ["#3ecf8e", "#f59e0b", "#6366f1", "#ef4444", "#06b6d4", "#ec4899"];

export function ChartMessage({ artifact }: { artifact: ChartArtifact["payload"] }) {
  const { chartType, title, data, xKey, yKey, keys, colors, stat } = artifact;
  const palette = colors || DEFAULT_COLORS;

  if (chartType === "stat" && stat) {
    return (
      <div
        className="rounded-lg px-3 py-2.5 my-1"
        style={{ backgroundColor: "#252525" }}
      >
        <p className="text-[10px] text-[#888] mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-[20px] font-semibold text-[#ededed]">
            {stat.value}
          </span>
          {stat.change && (
            <span
              className={`flex items-center gap-0.5 text-[11px] ${
                stat.changeType === "positive"
                  ? "text-[#3ecf8e]"
                  : stat.changeType === "negative"
                    ? "text-[#ef4444]"
                    : "text-[#888]"
              }`}
            >
              {stat.changeType === "positive" && <TrendingUp size={11} />}
              {stat.changeType === "negative" && <TrendingDown size={11} />}
              {stat.changeType === "neutral" && <Minus size={11} />}
              {stat.change}
            </span>
          )}
        </div>
        {stat.label && (
          <p className="text-[10px] text-[#666] mt-0.5">{stat.label}</p>
        )}
      </div>
    );
  }

  const chartKeys = keys || (yKey ? [yKey] : []);

  return (
    <div
      className="rounded-lg px-3 py-2.5 my-1"
      style={{ backgroundColor: "#252525" }}
    >
      <p className="text-[10px] text-[#888] mb-2">{title}</p>
      <div className="w-full h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 10, fill: "#888" }}
                axisLine={{ stroke: "#333" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#888" }}
                axisLine={{ stroke: "#333" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #333",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "#ededed",
                }}
              />
              {chartKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={palette[i % palette.length]}
                  radius={[3, 3, 0, 0]}
                />
              ))}
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 10, fill: "#888" }}
                axisLine={{ stroke: "#333" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#888" }}
                axisLine={{ stroke: "#333" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #333",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "#ededed",
                }}
              />
              {chartKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={palette[i % palette.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          ) : (
            <PieChart>
              <Pie
                data={data}
                dataKey={yKey || "value"}
                nameKey={xKey || "name"}
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={(props: { name?: string; percent?: number }) =>
                  `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={palette[i % palette.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #333",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "#ededed",
                }}
              />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
