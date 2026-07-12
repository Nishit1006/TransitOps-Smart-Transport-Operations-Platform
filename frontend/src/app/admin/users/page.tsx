"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiClientError } from "@/lib/api";
import { can, ROLES } from "@/lib/permissions";
import { useSession } from "@/hooks/use-session";
import { AdminUser } from "@/lib/types";
import { AccessDenied } from "@/components/access-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function CreateUserForm() {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<string>("DISPATCHER");

  const mutation = useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: string }) =>
      apiFetch("/api/admin/users", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_, variables) => {
      toast.success(`${variables.role} account created for ${variables.email}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to create user");
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    mutation.mutate(
      {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        role,
      },
      { onSuccess: () => e.currentTarget.reset() }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New User</CardTitle>
        <CardDescription>The account is created active and email-verified immediately.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={mutation.isPending} className="sm:w-fit">
            {mutation.isPending ? "Creating…" : "Create User"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EditUserDialog({ user }: { user: AdminUser }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [role, setRole] = useState<string>(user.role);
  const [status, setStatus] = useState<string>(user.isActive ? "ACTIVE" : "INACTIVE");

  const mutation = useMutation({
    mutationFn: (data: { role: string; isActive: boolean }) =>
      apiFetch(`/api/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success(`${user.email} updated`);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setOpen(false);
    },
    onError: (err) => toast.error(err instanceof ApiClientError ? err.message : "Failed to update user"),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate({ role, isActive: status === "ACTIVE" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Edit {user.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
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

export default function AdminUsersPage() {
  const session = useSession();
  const allowed = can(session.data?.role, "manageUsers");

  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiFetch<AdminUser[]>("/api/admin/users"),
    enabled: allowed,
  });

  if (session.isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-80 w-full" />
      </main>
    );
  }

  if (!session.data) return null;
  if (!allowed) return <AccessDenied />;

  const users = usersQuery.data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Create accounts with any role, or edit an existing user&apos;s role and status.
        </p>
      </div>

      <CreateUserForm />

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop table */}
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name} {u.id === session.data?.id && <Badge variant="secondary">You</Badge>}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "outline" : "destructive"}>
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {u.id === session.data?.id ? (
                      <span className="text-xs text-muted-foreground">Cannot edit yourself</span>
                    ) : (
                      <EditUserDialog user={u} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Mobile card list */}
          <div className="flex flex-col gap-3 md:hidden">
            {usersQuery.isLoading && <p className="text-center text-sm text-muted-foreground">Loading…</p>}
            {users.map((u) => (
              <Card key={u.id}>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {u.name} {u.id === session.data?.id && <Badge variant="secondary">You</Badge>}
                    </span>
                    <Badge variant={u.isActive ? "outline" : "destructive"}>
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{u.email} · {u.role}</p>
                  {u.id !== session.data?.id && (
                    <EditUserDialog user={u} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
