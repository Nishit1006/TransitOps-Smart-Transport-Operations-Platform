"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiClientError } from "@/lib/api";
import { can } from "@/lib/permissions";
import { useSession } from "@/hooks/use-session";
import { MaintenanceLog, MaintenanceStatus, MAINTENANCE_STATUSES, VehicleListItem } from "@/lib/types";
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

const STATUS_BADGE_VARIANT: Record<MaintenanceStatus, "default" | "secondary" | "destructive" | "outline"> = {
  IN_SHOP: "default",
  COMPLETED: "outline",
};

function CreateMaintenanceLogDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [vehicleId, setVehicleId] = useState<string>("");

  const vehiclesQuery = useQuery({
    queryKey: ["vehicles", "list", "AVAILABLE"],
    queryFn: () => apiFetch<VehicleListItem[]>("/api/vehicles?list=true&status=AVAILABLE"),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/maintenance-logs", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success("Maintenance log created — vehicle marked IN_SHOP");
      queryClient.invalidateQueries({ queryKey: ["maintenance-logs"] });
      setOpen(false);
      setVehicleId("");
    },
    onError: (err) => toast.error(err instanceof ApiClientError ? err.message : "Failed to create maintenance log"),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    mutation.mutate({
      vehicleId,
      serviceType: String(form.get("serviceType") ?? ""),
      cost: Number(form.get("cost")),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Send to Maintenance</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Send Vehicle to Maintenance</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="serviceType">Service Type</Label>
            <Input id="serviceType" name="serviceType" placeholder="e.g. Oil change, brake repair" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cost">Estimated Cost</Label>
            <Input id="cost" name="cost" type="number" step="0.01" min="0" required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !vehicleId}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CloseLogButton({ log }: { log: MaintenanceLog }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => apiFetch(`/api/maintenance-logs/${log.id}/close`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Maintenance log closed — vehicle restored");
      queryClient.invalidateQueries({ queryKey: ["maintenance-logs"] });
    },
    onError: (err) => toast.error(err instanceof ApiClientError ? err.message : "Failed to close log"),
  });

  return (
    <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      {mutation.isPending ? "Closing…" : "Close"}
    </Button>
  );
}

export default function MaintenancePage() {
  const session = useSession();
  const canManage = can(session.data?.role, "manageMaintenance");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const logsQuery = useQuery({
    queryKey: ["maintenance-logs", statusFilter],
    queryFn: () => {
      const qs = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      return apiFetch<MaintenanceLog[]>(`/api/maintenance-logs${qs}`);
    },
  });

  const logs = logsQuery.data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Maintenance</h1>
          <p className="text-sm text-muted-foreground">Vehicles currently in the shop and service history</p>
        </div>
        {canManage && <CreateMaintenanceLogDialog />}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {MAINTENANCE_STATUSES.map((s) => (
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
                <TableHead>Vehicle</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Service Date</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {!logsQuery.isLoading && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No maintenance logs found</TableCell>
                </TableRow>
              )}
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.vehicle.name} ({log.vehicle.registrationNumber})</TableCell>
                  <TableCell>{log.serviceType}</TableCell>
                  <TableCell>₹{Number(log.cost).toFixed(2)}</TableCell>
                  <TableCell>{new Date(log.serviceDate).toLocaleDateString()}</TableCell>
                  <TableCell><Badge variant={STATUS_BADGE_VARIANT[log.status]}>{log.status}</Badge></TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {log.status === "IN_SHOP" && <CloseLogButton log={log} />}
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
        {logsQuery.isLoading && <p className="text-center text-sm text-muted-foreground">Loading…</p>}
        {!logsQuery.isLoading && logs.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No maintenance logs found</p>
        )}
        {logs.map((log) => (
          <Card key={log.id}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{log.vehicle.name} ({log.vehicle.registrationNumber})</span>
                <Badge variant={STATUS_BADGE_VARIANT[log.status]}>{log.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{log.serviceType}</p>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>₹{Number(log.cost).toFixed(2)}</span>
                <span>{new Date(log.serviceDate).toLocaleDateString()}</span>
              </div>
              {canManage && log.status === "IN_SHOP" && (
                <CloseLogButton log={log} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
