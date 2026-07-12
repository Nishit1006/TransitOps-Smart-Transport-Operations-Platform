"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiClientError } from "@/lib/api";
import { OrgSettings } from "@/lib/types";
import { can } from "@/lib/permissions";
import { useSession } from "@/hooks/use-session";
import { AccessDenied } from "@/components/access-denied";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const session = useSession();
  const allowed = can(session.data?.role, "settings");
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<OrgSettings>("/api/settings"),
    enabled: allowed,
  });

  const [depotName, setDepotName] = useState("");
  const [currency, setCurrency] = useState("");
  const [distanceUnit, setDistanceUnit] = useState<"KM" | "MILES">("KM");

  useEffect(() => {
    if (settingsQuery.data) {
      setDepotName(settingsQuery.data.depotName);
      setCurrency(settingsQuery.data.currency);
      setDistanceUnit(settingsQuery.data.distanceUnit);
    }
  }, [settingsQuery.data]);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<OrgSettings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ depotName, currency, distanceUnit }),
      }),
    onSuccess: () => {
      toast.success("Settings updated");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update settings");
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate();
  };

  if (session.isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (!session.data) return null;
  if (!allowed) return <AccessDenied />;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Organization-wide configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Org Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {settingsQuery.isLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2 md:col-span-2">
                <Label htmlFor="depotName">Depot Name</Label>
                <Input
                  id="depotName"
                  value={depotName}
                  onChange={(e) => setDepotName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Distance Unit</Label>
                <Select value={distanceUnit} onValueChange={(v) => setDistanceUnit(v as "KM" | "MILES")}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KM">Kilometers (KM)</SelectItem>
                    <SelectItem value="MILES">Miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={mutation.isPending} className="md:col-span-2">
                {mutation.isPending ? "Saving…" : "Save Settings"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
