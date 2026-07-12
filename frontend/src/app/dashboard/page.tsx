"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Truck, CheckCircle2, Wrench, Route, Clock, Users, Gauge } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import {
  DashboardKpis,
  RecentTrip,
  VehicleStatusBreakdownEntry,
  VEHICLE_TYPES,
  VEHICLE_STATUSES,
} from "@/lib/types";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const REFETCH_INTERVAL = 30_000;

const STATUS_BADGE_VARIANT: Record<RecentTrip["status"], "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  DISPATCHED: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [regionFilter, setRegionFilter] = useState<string>("ALL");

  useEffect(() => {
    const denied = searchParams.get("denied");
    if (denied) {
      toast.error(`You don't have access to ${denied}`);
      router.replace("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const kpisQuery = useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: () => apiFetch<DashboardKpis>("/api/dashboard/kpis"),
    refetchInterval: REFETCH_INTERVAL,
  });

  const recentTripsQuery = useQuery({
    queryKey: ["dashboard", "recent-trips"],
    queryFn: () => apiFetch<RecentTrip[]>("/api/dashboard/recent-trips"),
    refetchInterval: REFETCH_INTERVAL,
  });

  const statusBreakdownQuery = useQuery({
    queryKey: ["dashboard", "vehicle-status-breakdown"],
    queryFn: () => apiFetch<VehicleStatusBreakdownEntry[]>("/api/dashboard/vehicle-status-breakdown"),
    refetchInterval: REFETCH_INTERVAL,
  });

  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const trip of recentTripsQuery.data ?? []) {
      if (trip.vehicle.region) set.add(trip.vehicle.region);
    }
    return Array.from(set).sort();
  }, [recentTripsQuery.data]);

  const filteredTrips = useMemo(() => {
    return (recentTripsQuery.data ?? []).filter((trip) => {
      if (typeFilter !== "ALL" && trip.vehicle.type !== typeFilter) return false;
      if (statusFilter !== "ALL" && trip.vehicle.status !== statusFilter) return false;
      if (regionFilter !== "ALL" && trip.vehicle.region !== regionFilter) return false;
      return true;
    });
  }, [recentTripsQuery.data, typeFilter, statusFilter, regionFilter]);

  const k = kpisQuery.data;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live fleet operations overview</p>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Vehicle Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {VEHICLE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Vehicle Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {VEHICLE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Region" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Regions</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Active Vehicles" value={k?.activeVehicles ?? 0} icon={Truck} isLoading={kpisQuery.isLoading} />
        <KpiCard label="Available" value={k?.availableVehicles ?? 0} icon={CheckCircle2} isLoading={kpisQuery.isLoading} />
        <KpiCard label="In Maintenance" value={k?.vehiclesInMaintenance ?? 0} icon={Wrench} isLoading={kpisQuery.isLoading} />
        <KpiCard label="Active Trips" value={k?.activeTrips ?? 0} icon={Route} isLoading={kpisQuery.isLoading} />
        <KpiCard label="Pending Trips" value={k?.pendingTrips ?? 0} icon={Clock} isLoading={kpisQuery.isLoading} />
        <KpiCard label="Drivers On Duty" value={k?.driversOnDuty ?? 0} icon={Users} isLoading={kpisQuery.isLoading} />
        <KpiCard
          label="Fleet Utilization"
          value={k ? `${k.fleetUtilization}%` : "0%"}
          icon={Gauge}
          isLoading={kpisQuery.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent trips */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ETA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTripsQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!recentTripsQuery.isLoading && filteredTrips.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No trips found
                    </TableCell>
                  </TableRow>
                )}
                {filteredTrips.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell>{trip.source} → {trip.destination}</TableCell>
                    <TableCell>{trip.vehicle.name} ({trip.vehicle.registrationNumber})</TableCell>
                    <TableCell>{trip.driver.name}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[trip.status]}>{trip.status}</Badge>
                    </TableCell>
                    <TableCell>{trip.etaMinutes != null ? `${trip.etaMinutes} min` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Vehicle status breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusBreakdownQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={statusBreakdownQuery.data ?? []}
                  layout="vertical"
                  margin={{ left: 12, right: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="status" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-primary, #6366f1)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
