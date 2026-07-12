"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiClientError } from "@/lib/api";
import { can, ROLES } from "@/lib/permissions";
import { useSession } from "@/hooks/use-session";
import { AccessDenied } from "@/components/access-denied";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsersPage() {
  const session = useSession();
  const allowed = can(session.data?.role, "manageUsers");
  const [role, setRole] = useState<string>("DISPATCHER");

  const mutation = useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: string }) =>
      apiFetch("/api/admin/users", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_, variables) => {
      toast.success(`${variables.role} account created for ${variables.email}`);
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

  if (session.isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-80 w-full" />
      </main>
    );
  }

  if (!session.data) return null;
  if (!allowed) return <AccessDenied />;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Create User</h1>
        <p className="text-sm text-muted-foreground">
          Grant an account any role directly — self-serve registration always defaults to
          Dispatcher.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New User</CardTitle>
          <CardDescription>The account is created active and email-verified immediately.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create User"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
