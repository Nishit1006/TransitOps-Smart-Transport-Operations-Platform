"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiClientError } from "@/lib/api";
import { EXPENSE_TYPES, Expense, FuelLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function LogFuelDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { vehicleId: string; tripId: string; liters: number; cost: number }) =>
      apiFetch("/api/fuel-logs", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: data.vehicleId,
          tripId: data.tripId || undefined,
          liters: data.liters,
          cost: data.cost,
        }),
      }),
    onSuccess: () => {
      toast.success("Fuel log recorded");
      queryClient.invalidateQueries({ queryKey: ["fuel-logs"] });
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to record fuel log");
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    mutation.mutate({
      vehicleId: String(form.get("vehicleId") ?? ""),
      tripId: String(form.get("tripId") ?? ""),
      liters: Number(form.get("liters")),
      cost: Number(form.get("cost")),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Log Fuel</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Log Fuel</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="vehicleId">Vehicle ID</Label>
            <Input id="vehicleId" name="vehicleId" required placeholder="Vehicle UUID" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tripId">Trip ID (optional)</Label>
            <Input id="tripId" name="tripId" placeholder="Trip UUID" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="liters">Liters</Label>
            <Input id="liters" name="liters" type="number" step="0.01" min="0.01" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cost">Cost</Label>
            <Input id="cost" name="cost" type="number" step="0.01" min="0" required />
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

function AddExpenseDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("TOLL");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: {
      vehicleId: string;
      tripId: string;
      type: string;
      amount: number;
      description: string;
    }) =>
      apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: data.vehicleId,
          tripId: data.tripId || undefined,
          type: data.type,
          amount: data.amount,
          description: data.description || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("Expense added");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to add expense");
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    mutation.mutate({
      vehicleId: String(form.get("vehicleId") ?? ""),
      tripId: String(form.get("tripId") ?? ""),
      type,
      amount: Number(form.get("amount")),
      description: String(form.get("description") ?? ""),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Add Expense</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="exp-vehicleId">Vehicle ID</Label>
            <Input id="exp-vehicleId" name="vehicleId" required placeholder="Vehicle UUID" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="exp-tripId">Trip ID (optional)</Label>
            <Input id="exp-tripId" name="tripId" placeholder="Trip UUID" />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" name="description" />
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

export default function FuelExpensesPage() {
  const fuelLogsQuery = useQuery({
    queryKey: ["fuel-logs"],
    queryFn: () => apiFetch<FuelLog[]>("/api/fuel-logs"),
  });

  const expensesQuery = useQuery({
    queryKey: ["expenses"],
    queryFn: () => apiFetch<Expense[]>("/api/expenses"),
  });

  const totalFuelCost = (fuelLogsQuery.data ?? []).reduce((sum, f) => sum + Number(f.cost), 0);
  const totalMaintenanceCost = (expensesQuery.data ?? [])
    .filter((e) => e.type === "MAINTENANCE")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const otherExpenses = (expensesQuery.data ?? []).filter((e) => e.type !== "FUEL");

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Fuel &amp; Expenses</h1>
          <p className="text-sm text-muted-foreground">Track fuel logs and operational expenses</p>
        </div>
        <div className="flex gap-2">
          <LogFuelDialog />
          <AddExpenseDialog />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fuel Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Trip</TableHead>
                <TableHead>Liters</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fuelLogsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {!fuelLogsQuery.isLoading && (fuelLogsQuery.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No fuel logs yet</TableCell>
                </TableRow>
              )}
              {(fuelLogsQuery.data ?? []).map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.vehicleId}</TableCell>
                  <TableCell className="font-mono text-xs">{f.tripId ?? "—"}</TableCell>
                  <TableCell>{Number(f.liters).toFixed(2)}</TableCell>
                  <TableCell>₹{Number(f.cost).toFixed(2)}</TableCell>
                  <TableCell>{new Date(f.date).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Other Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expensesQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {!expensesQuery.isLoading && otherExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No expenses yet</TableCell>
                </TableRow>
              )}
              {otherExpenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.vehicleId}</TableCell>
                  <TableCell>{e.type}</TableCell>
                  <TableCell>₹{Number(e.amount).toFixed(2)}</TableCell>
                  <TableCell>{e.description ?? "—"}</TableCell>
                  <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <div className="border-t px-4 py-3 text-sm text-muted-foreground">
          Total Operational Cost (Auto) = Fuel (₹{totalFuelCost.toFixed(2)}) + Maintenance (₹
          {totalMaintenanceCost.toFixed(2)}) ={" "}
          <span className="font-semibold text-foreground">
            ₹{(totalFuelCost + totalMaintenanceCost).toFixed(2)}
          </span>
        </div>
      </Card>
    </main>
  );
}
