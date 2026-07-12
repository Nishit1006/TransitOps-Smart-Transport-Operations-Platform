"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiClientError } from "@/lib/api";
import { can } from "@/lib/permissions";
import { useSession } from "@/hooks/use-session";
import { Vehicle, VEHICLE_TYPES, VEHICLE_STATUSES, VehicleStatus } from "@/lib/types";
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

const STATUS_BADGE_VARIANT: Record<VehicleStatus, "default" | "secondary" | "destructive" | "outline"> = {
  AVAILABLE: "outline",
  ON_TRIP: "default",
  IN_SHOP: "secondary",
  RETIRED: "destructive",
};

function VehicleFormDialog({ vehicle, trigger }: { vehicle?: Vehicle; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isEdit = !!vehicle;
  const [type, setType] = useState<string>(vehicle?.type ?? "TRUCK");
  const [status, setStatus] = useState<string>(vehicle?.status ?? "AVAILABLE");

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch(isEdit ? `/api/vehicles/${vehicle!.id}` : "/api/vehicles", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success(isEdit ? "Vehicle updated" : "Vehicle created");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setOpen(false);
    },
    onError: (err) => toast.error(err instanceof ApiClientError ? err.message : "Failed to save vehicle"),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const odometerKm = form.get("odometerKm");
    mutation.mutate({
      registrationNumber: String(form.get("registrationNumber") ?? ""),
      name: String(form.get("name") ?? ""),
      type,
      maxLoadCapacityKg: Number(form.get("maxLoadCapacityKg")),
      acquisitionCost: Number(form.get("acquisitionCost")),
      ...(odometerKm ? { odometerKm: Number(odometerKm) } : {}),
      status,
      region: String(form.get("region") ?? "") || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="registrationNumber">Registration Number</Label>
              <Input
                id="registrationNumber"
                name="registrationNumber"
                defaultValue={vehicle?.registrationNumber}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={vehicle?.name} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxLoadCapacityKg">Max Load Capacity (kg)</Label>
              <Input
                id="maxLoadCapacityKg"
                name="maxLoadCapacityKg"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={vehicle?.maxLoadCapacityKg}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="acquisitionCost">Acquisition Cost</Label>
              <Input
                id="acquisitionCost"
                name="acquisitionCost"
                type="number"
                step="0.01"
                min="0"
                defaultValue={vehicle?.acquisitionCost}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="odometerKm">Odometer (km)</Label>
              <Input
                id="odometerKm"
                name="odometerKm"
                type="number"
                step="0.01"
                min="0"
                defaultValue={vehicle?.odometerKm}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="region">Region</Label>
              <Input id="region" name="region" defaultValue={vehicle?.region ?? ""} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function VehiclesPage() {
  const session = useSession();
  const canManage = can(session.data?.role, "manageVehicles");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const vehiclesQuery = useQuery({
    queryKey: ["vehicles", typeFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const qs = params.toString();
      return apiFetch<Vehicle[]>(`/api/vehicles${qs ? `?${qs}` : ""}`);
    },
  });

  const vehicles = vehiclesQuery.data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Vehicle Registry</h1>
          <p className="text-sm text-muted-foreground">Fleet vehicles and their current status</p>
        </div>
        {canManage && <VehicleFormDialog trigger={<Button>Add Vehicle</Button>} />}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {VEHICLE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {VEHICLE_STATUSES.map((s) => (
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
                <TableHead>Reg. Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Max Load</TableHead>
                <TableHead>Odometer</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehiclesQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {!vehiclesQuery.isLoading && vehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">No vehicles found</TableCell>
                </TableRow>
              )}
              {vehicles.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.registrationNumber}</TableCell>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.type}</TableCell>
                  <TableCell><Badge variant={STATUS_BADGE_VARIANT[v.status]}>{v.status}</Badge></TableCell>
                  <TableCell>{v.region ?? "—"}</TableCell>
                  <TableCell>{Number(v.maxLoadCapacityKg).toLocaleString()} kg</TableCell>
                  <TableCell>{Number(v.odometerKm).toLocaleString()} km</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <VehicleFormDialog vehicle={v} trigger={<Button variant="outline" size="sm">Edit</Button>} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile card list */}
      <div className="flex flex-col gap-3 md:hidden">
        {vehiclesQuery.isLoading && <p className="text-center text-sm text-muted-foreground">Loading…</p>}
        {!vehiclesQuery.isLoading && vehicles.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No vehicles found</p>
        )}
        {vehicles.map((v) => (
          <Card key={v.id}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{v.registrationNumber}</span>
                <Badge variant={STATUS_BADGE_VARIANT[v.status]}>{v.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{v.name} · {v.type}</p>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{v.region ?? "—"}</span>
                <span>{Number(v.odometerKm).toLocaleString()} km</span>
              </div>
              {canManage && (
                <VehicleFormDialog
                  vehicle={v}
                  trigger={<Button variant="outline" size="sm" className="mt-1 w-full">Edit</Button>}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
