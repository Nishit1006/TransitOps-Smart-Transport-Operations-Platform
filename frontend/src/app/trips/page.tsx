"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiClientError } from "@/lib/api";
import { can } from "@/lib/permissions";
import { useSession } from "@/hooks/use-session";
import { Trip, TripStatus, TRIP_STATUSES, VehicleListItem, DriverListItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_BADGE_VARIANT: Record<TripStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  DISPATCHED: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

function CreateTripDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [vehicleId, setVehicleId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");

  const vehiclesQuery = useQuery({
    queryKey: ["vehicles", "list", "AVAILABLE"],
    queryFn: () => apiFetch<VehicleListItem[]>("/api/vehicles?list=true&status=AVAILABLE"),
    enabled: open,
  });

  const driversQuery = useQuery({
    queryKey: ["drivers", "list", "AVAILABLE"],
    queryFn: () => apiFetch<DriverListItem[]>("/api/drivers?list=true&status=AVAILABLE"),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/trips", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success("Trip created as draft");
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setOpen(false);
      setVehicleId("");
      setDriverId("");
    },
    onError: (err) => toast.error(err instanceof ApiClientError ? err.message : "Failed to create trip"),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    mutation.mutate({
      source: String(form.get("source") ?? ""),
      destination: String(form.get("destination") ?? ""),
      vehicleId,
      driverId,
      cargoWeightKg: Number(form.get("cargoWeightKg")),
      plannedDistanceKm: Number(form.get("plannedDistanceKm")),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Trip</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Create Trip</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="source">Source</Label>
              <Input id="source" name="source" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="destination">Destination</Label>
              <Input id="destination" name="destination" required />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Vehicle</Label>
              <Select value={vehicleId} onValueChange={setVehicleId} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={vehiclesQuery.isLoading ? "Loading…" : "Select an available vehicle"} />
                </SelectTrigger>
                <SelectContent>
                  {(vehiclesQuery.data ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</SelectItem>
                  ))}
                  {vehiclesQuery.data?.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No available vehicles</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Driver</Label>
              <Select value={driverId} onValueChange={setDriverId} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={driversQuery.isLoading ? "Loading…" : "Select an available driver"} />
                </SelectTrigger>
                <SelectContent>
                  {(driversQuery.data ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                  {driversQuery.data?.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No available drivers</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cargoWeightKg">Cargo Weight (kg)</Label>
              <Input id="cargoWeightKg" name="cargoWeightKg" type="number" step="0.01" min="0.01" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="plannedDistanceKm">Planned Distance (km)</Label>
              <Input id="plannedDistanceKm" name="plannedDistanceKm" type="number" step="0.01" min="0.01" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !vehicleId || !driverId}>
              {mutation.isPending ? "Creating…" : "Create Draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CompleteTripDialog({ trip }: { trip: Trip }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch(`/api/trips/${trip.id}/complete`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success("Trip completed");
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setOpen(false);
    },
    onError: (err) => toast.error(err instanceof ApiClientError ? err.message : "Failed to complete trip"),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const fuelCost = form.get("fuelCost");
    const revenue = form.get("revenue");
    mutation.mutate({
      endOdometerKm: Number(form.get("endOdometerKm")),
      fuelConsumedLiters: Number(form.get("fuelConsumedLiters")),
      ...(fuelCost ? { fuelCost: Number(fuelCost) } : {}),
      ...(revenue ? { revenue: Number(revenue) } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Complete</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Complete Trip</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="endOdometerKm">End Odometer (km)</Label>
            <Input
              id="endOdometerKm"
              name="endOdometerKm"
              type="number"
              step="0.01"
              min={trip.startOdometerKm ?? "0"}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fuelConsumedLiters">Fuel Consumed (liters)</Label>
            <Input id="fuelConsumedLiters" name="fuelConsumedLiters" type="number" step="0.01" min="0" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fuelCost">Fuel Cost (optional)</Label>
            <Input id="fuelCost" name="fuelCost" type="number" step="0.01" min="0" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="revenue">Revenue (optional)</Label>
            <Input id="revenue" name="revenue" type="number" step="0.01" min="0" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Completing…" : "Complete Trip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TripActions({ trip, canManage }: { trip: Trip; canManage: boolean }) {
  const queryClient = useQueryClient();

  const dispatchMutation = useMutation({
    mutationFn: () => apiFetch(`/api/trips/${trip.id}/dispatch`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Trip dispatched");
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (err) => toast.error(err instanceof ApiClientError ? err.message : "Failed to dispatch trip"),
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiFetch(`/api/trips/${trip.id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Trip cancelled");
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (err) => toast.error(err instanceof ApiClientError ? err.message : "Failed to cancel trip"),
  });

  if (!canManage) return null;

  if (trip.status === "DRAFT") {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" onClick={() => dispatchMutation.mutate()} disabled={dispatchMutation.isPending}>
          {dispatchMutation.isPending ? "Dispatching…" : "Dispatch"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
        >
          Cancel
        </Button>
      </div>
    );
  }

  if (trip.status === "DISPATCHED") {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <CompleteTripDialog trip={trip} />
        <Button
          size="sm"
          variant="outline"
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return null;
}

export default function TripsPage() {
  const session = useSession();
  const canManage = can(session.data?.role, "manageTrips");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const tripsQuery = useQuery({
    queryKey: ["trips", statusFilter],
    queryFn: () => {
      const qs = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      return apiFetch<Trip[]>(`/api/trips${qs}`);
    },
    refetchInterval: 30_000,
  });

  const trips = tripsQuery.data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Trip Live Board</h1>
          <p className="text-sm text-muted-foreground">Create, dispatch, and track trips in real time</p>
        </div>
        {canManage && <CreateTripDialog />}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {TRIP_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tripsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {!tripsQuery.isLoading && trips.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No trips found</TableCell>
                </TableRow>
              )}
              {trips.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.source} → {t.destination}</TableCell>
                  <TableCell>{t.vehicle.name} ({t.vehicle.registrationNumber})</TableCell>
                  <TableCell>{t.driver.name}</TableCell>
                  <TableCell>{Number(t.cargoWeightKg).toLocaleString()} kg</TableCell>
                  <TableCell><Badge variant={STATUS_BADGE_VARIANT[t.status]}>{t.status}</Badge></TableCell>
                  {canManage && (
                    <TableCell><TripActions trip={t} canManage={canManage} /></TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile card list */}
      <div className="flex flex-col gap-3 md:hidden">
        {tripsQuery.isLoading && <p className="text-center text-sm text-muted-foreground">Loading…</p>}
        {!tripsQuery.isLoading && trips.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No trips found</p>
        )}
        {trips.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{t.source} → {t.destination}</span>
                <Badge variant={STATUS_BADGE_VARIANT[t.status]}>{t.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.vehicle.name} ({t.vehicle.registrationNumber}) · {t.driver.name}
              </p>
              <p className="text-sm text-muted-foreground">{Number(t.cargoWeightKg).toLocaleString()} kg cargo</p>
              {canManage && <TripActions trip={t} canManage={canManage} />}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
