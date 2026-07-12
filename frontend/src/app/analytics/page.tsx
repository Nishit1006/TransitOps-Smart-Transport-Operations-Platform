"use client";

import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Fuel, Gauge, Wallet, TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AnalyticsSummary } from "@/lib/types";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const REFETCH_INTERVAL = 30_000;

type MonthlyRevenueEntry = { month: string; revenue: number };
type CostliestVehicle = { vehicleId: string; name: string; registrationNumber: string; totalCost: number };

export default function AnalyticsPage() {
  const summaryQuery = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => apiFetch<AnalyticsSummary>("/api/analytics/summary"),
    refetchInterval: REFETCH_INTERVAL,
  });

  const monthlyRevenueQuery = useQuery({
    queryKey: ["analytics", "monthly-revenue"],
    queryFn: () => apiFetch<MonthlyRevenueEntry[]>("/api/analytics/monthly-revenue"),
    refetchInterval: REFETCH_INTERVAL,
  });

  const costliestQuery = useQuery({
    queryKey: ["analytics", "top-costliest-vehicles"],
    queryFn: () => apiFetch<CostliestVehicle[]>("/api/analytics/top-costliest-vehicles"),
    refetchInterval: REFETCH_INTERVAL,
  });

  const s = summaryQuery.data;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Fleet performance and financial metrics</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Fuel Efficiency"
          value={s ? `${s.fuelEfficiency} km/L` : "—"}
          icon={Fuel}
          isLoading={summaryQuery.isLoading}
        />
        <KpiCard
          label="Fleet Utilization"
          value={s ? `${s.fleetUtilization}%` : "—"}
          icon={Gauge}
          isLoading={summaryQuery.isLoading}
        />
        <KpiCard
          label="Operational Cost"
          value={s ? `₹${s.totalOperationalCost.toLocaleString()}` : "—"}
          icon={Wallet}
          isLoading={summaryQuery.isLoading}
        />
        <KpiCard
          label="Vehicle ROI"
          value={s ? `${(s.avgVehicleROI * 100).toFixed(1)}%` : "—"}
          icon={TrendingUp}
          isLoading={summaryQuery.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyRevenueQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !monthlyRevenueQuery.data?.length ? (
              <p className="text-sm text-muted-foreground">No completed trips with revenue yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyRevenueQuery.data} margin={{ left: 4, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="var(--color-primary, #6366f1)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Costliest Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            {costliestQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !costliestQuery.data?.length ? (
              <p className="text-sm text-muted-foreground">No fuel or expense records yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={costliestQuery.data}
                  layout="vertical"
                  margin={{ left: 12, right: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="registrationNumber" width={90} />
                  <Tooltip />
                  <Bar dataKey="totalCost" fill="var(--color-destructive, #ef4444)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
