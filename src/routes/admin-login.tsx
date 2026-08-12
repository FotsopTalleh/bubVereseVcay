import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PoweredBy, Wordmark } from "@/components/brand";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/session";
import type { AdminAccount } from "@/lib/types";

// Deliberately not linked from any public nav — administrators are given
// this URL directly, planners and the public never see it.
export const Route = createFileRoute("/admin-login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <Wordmark className="text-2xl" />
        <p className="tracking-arch mt-2 text-[10px] text-muted-foreground">Administrator access</p>
      </div>

      <form
        className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          void (async () => {
            try {
              const result = await api.post<{ admin: AdminAccount; token: string }>(
                "/auth/admin/login",
                { email, password },
              );
              setSession({ role: "admin", token: result.token });
              toast.success("Signed in as administrator");
              void router.navigate({ to: "/admin" });
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : "Sign in failed.");
            } finally {
              setSubmitting(false);
            }
          })();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="admin-email">Email</Label>
          <Input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-password">Password</Label>
          <Input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Admin accounts are created with the backend's create_admin script.
        </p>
      </form>

      <PoweredBy />
    </main>
  );
}
