import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ViolationChartsProps {
  violations: { type: string; severity: string; created_at: string }[];
  attempts: { user_id: string; risk_level?: string | null; credibility_score?: number | null }[];
}

const COLORS = ['hsl(var(--foreground))', 'hsl(var(--muted-foreground))', 'hsl(var(--danger))', 'hsl(var(--warning))'];

const ViolationCharts = ({ violations, attempts }: ViolationChartsProps) => {
  const violationsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    violations.forEach((v) => {
      counts[v.type] = (counts[v.type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({ type: type.replace(/_/g, ' '), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [violations]);

  const riskDistribution = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0, none: 0 };
    attempts.forEach((a) => {
      if (a.risk_level === 'low') counts.low++;
      else if (a.risk_level === 'medium') counts.medium++;
      else if (a.risk_level === 'high') counts.high++;
      else counts.none++;
    });
    return [
      { name: 'Low', value: counts.low },
      { name: 'Medium', value: counts.medium },
      { name: 'High', value: counts.high },
    ].filter((d) => d.value > 0);
  }, [attempts]);

  const severityCounts = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0, critical: 0 };
    violations.forEach((v) => {
      if (v.severity in counts) counts[v.severity as keyof typeof counts]++;
    });
    return [
      { severity: 'Low', count: counts.low },
      { severity: 'Medium', count: counts.medium },
      { severity: 'High', count: counts.high },
      { severity: 'Critical', count: counts.critical },
    ];
  }, [violations]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Violations by Type */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium mb-4">Violations by Type</h4>
        {violationsByType.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={violationsByType} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={75} />
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(var(--foreground))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">No violations</p>
        )}
      </div>

      {/* Risk Distribution */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium mb-4">Risk Distribution</h4>
        {riskDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={riskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {riskDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">No data</p>
        )}
      </div>

      {/* Severity Breakdown */}
      <div className="border border-border rounded-lg p-4 md:col-span-2">
        <h4 className="text-sm font-medium mb-4">Violations by Severity</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={severityCounts}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="severity" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
            <Bar dataKey="count" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ViolationCharts;
