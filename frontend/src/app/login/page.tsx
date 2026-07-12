"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const sessionQuery = useSession();

  useEffect(() => {
    if (sessionQuery.data) {
      router.replace("/dashboard");
    }
  }, [sessionQuery.data, router]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: form.get("password") }),
      });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Logged in");
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        toast.info("Please verify your email first — check your inbox for the OTP.");
        setPendingEmail(email);
      } else {
        toast.error(err instanceof ApiClientError ? err.message : "Login failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email,
          password: form.get("password"),
        }),
      });
      toast.success("Account created. Check your email for the OTP.");
      setPendingEmail(email);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!pendingEmail) return;
    setIsSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: pendingEmail, otp: form.get("otp") }),
      });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Email verified");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Verification failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingEmail) return;
    setIsResending(true);
    try {
      await apiFetch("/api/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email: pendingEmail }),
      });
      toast.success("A new OTP has been sent");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to resend OTP");
    } finally {
      setIsResending(false);
    }
  };

  if (pendingEmail) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Verify your email</CardTitle>
            <CardDescription>Enter the 6-digit code sent to {pendingEmail}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="otp">OTP Code</Label>
                <Input
                  id="otp"
                  name="otp"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="123456"
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="mt-2">
                {isSubmitting ? "Verifying…" : "Verify"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isResending}
                onClick={handleResendOtp}
              >
                {isResending ? "Resending…" : "Resend OTP"}
              </Button>
              <Button type="button" variant="link" onClick={() => setPendingEmail(null)}>
                Back to login
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>TransitOps</CardTitle>
          <CardDescription>Sign in or create an account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="login">Log In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" name="email" type="email" required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" name="password" type="password" required />
                </div>
                <Button type="submit" disabled={isSubmitting} className="mt-2">
                  {isSubmitting ? "Logging in…" : "Log In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reg-name">Name</Label>
                  <Input id="reg-name" name="name" required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" name="email" type="email" required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input id="reg-password" name="password" type="password" required minLength={8} />
                </div>
                <p className="text-xs text-muted-foreground">
                  New accounts are created with basic Dispatcher access. Contact an admin to
                  request a different role.
                </p>
                <Button type="submit" disabled={isSubmitting} className="mt-2">
                  {isSubmitting ? "Creating…" : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
