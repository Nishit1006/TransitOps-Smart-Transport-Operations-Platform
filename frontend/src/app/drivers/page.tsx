"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiClientError } from "@/lib/api";
import { can } from "@/lib/permissions";
import { useSession } from "@/hooks/use-session";
import { Driver, LICENSE_CATEGORIES, DRIVER_STATUSES, DriverStatus } from "@/lib/types";
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

const STATUS_BADGE_VARIANT: Record<DriverStatus, "default" | "secondary" | "destructive" | "outline"> = {
  AVAILABLE: "outline",
  ON_TRIP: "default",
  OFF_DUTY: "secondary",
  SUSPENDED: "destructive",
};

function isExpired(dateStr: string) {
  return new Date(dateStr) <= new Date();
}

function DriverFormDialog({ driver, trigger }: { driver?: Driver; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isEdit = !!driver;
  const [licenseCategory, setLicenseCategory] = useState<string>(driver?.licenseCategory ?? "LMV");
  const [status, setStatus] = useState<string>(driver?.status ?? "AVAILABLE");

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch(isEdit ? `/api/drivers/${driver!.id}` : "/api/drivers", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success(isEdit ? "Driver updated" : "Driver created");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setOpen(false);
    },
    onError: (err) => toast.error(err instanceof ApiClientError ? err.message : "Failed to save driver"),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const safetyScore = form.get("safetyScore");
    mutation.mutate({
      name: String(form.get("name") ?? ""),
      licenseNumber: String(form.get("licenseNumber") ?? ""),
      licenseCategory,
      licenseExpiryDate: String(form.get("licenseExpiryDate") ?? ""),
      contactNumber: String(form.get("contactNumber") ?? ""),
      ...(safetyScore ? { safetyScore: Number(safetyScore) } : {}),
      status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Driver" : "Add Driver"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={driver?.name} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input id="licenseNumber" name="licenseNumber" defaultValue={driver?.licenseNumber} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>License Category</Label>
              <Select value={licenseCategory} onValueChange={setLicenseCategory}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LICENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="licenseExpiryDate">License Expiry</Label>
              <Input
                id="licenseExpiryDate"
                name="licenseExpiryDate"
                type="date"
                defaultValue={driver?.licenseExpiryDate?.slice(0, 10)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input id="contactNumber" name="contactNumber" defaultValue={driver?.contactNumber} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="safetyScore">Safety Score (0-100)</Label>
              <Input
                id="safetyScore"
                name="safetyScore"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={driver?.safetyScore}
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DRIVER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

export default function DriversPage() {
  const session = useSession();
  const canManage = can(session.data?.role, "manageDrivers");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const driversQuery = useQuery({
    queryKey: ["drivers", statusFilter, categoryFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (categoryFilter !== "ALL") params.set("licenseCategory", categoryFilter);
      const qs = params.toString();
      return apiFetch<Driver[]>(`/api/drivers${qs ? `?${qs}` : ""}`);
    },
  });

  const drivers = driversQuery.data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Driver Management</h1>
          <p className="text-sm text-muted-foreground">Drivers, licenses, and safety compliance</p>
        </div>
        {canManage && <DriverFormDialog trigger={<Button>Add Driver</Button>} />}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {DRIVER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="License Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {LICENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
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
                <TableHead>Name</TableHead>
                <TableHead>License #</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>License Expiry</TableHead>
                <TableHead>Safety Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trips Completed</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {driversQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {!driversQuery.isLoading && drivers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">No drivers found</TableCell>
                </TableRow>
              )}
              {drivers.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.licenseNumber}</TableCell>
                  <TableCell>{d.licenseCategory}</TableCell>
                  <TableCell className={isExpired(d.licenseExpiryDate) ? "text-destructive" : undefined}>
                    {new Date(d.licenseExpiryDate).toLocaleDateString()}
                    {isExpired(d.licenseExpiryDate) && " (expired)"}
                  </TableCell>
                  <TableCell>{Number(d.safetyScore).toFixed(1)}</TableCell>
                  <TableCell><Badge variant={STATUS_BADGE_VARIANT[d.status]}>{d.status}</Badge></TableCell>
                  <TableCell>{d.tripsCompletedCount}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <DriverFormDialog driver={d} trigger={<Button variant="outline" size="sm">Edit</Button>} />
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
        {driversQuery.isLoading && <p className="text-center text-sm text-muted-foreground">Loading…</p>}
        {!driversQuery.isLoading && drivers.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No drivers found</p>
        )}
        {drivers.map((d) => (
          <Card key={d.id}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{d.name}</span>
                <Badge variant={STATUS_BADGE_VARIANT[d.status]}>{d.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{d.licenseNumber} · {d.licenseCategory}</p>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span className={isExpired(d.licenseExpiryDate) ? "text-destructive" : undefined}>
                  Expires {new Date(d.licenseExpiryDate).toLocaleDateString()}
                </span>
                <span>Score {Number(d.safetyScore).toFixed(1)}</span>
              </div>
              {canManage && (
                <DriverFormDialog
                  driver={d}
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
