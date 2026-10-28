import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function EngagementChart({ data }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
          <Tooltip
            formatter={(value) => [`${value}%`, "Engagement"]}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="engagement"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}