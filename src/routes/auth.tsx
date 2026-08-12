import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PoweredBy, Wordmark } from "@/components/brand";
import { GOOGLE_SIGN_IN_ENABLED, GoogleSignInButton } from "@/components/GoogleSignInButton";
import { PasswordStrength, passwordMeetsStrength } from "@/components/PasswordStrength";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/session";
import { CHANNEL_TYPES, type ChannelType, type Organizer } from "@/lib/types";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Planner Sign In — BubVerseVacy" },
      {
        name: "description",
        content:
          "Sign in or register as an event planner to publish events to the BubVerseVacy map.",
      },
      { property: "og:title", content: "Planner Sign In — BubVerseVacy" },
      { property: "og:description", content: "Publish and manage your events on BubVerseVacy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function AuthPage() {
  const router = useRouter();

  const handleGoogleCredential = async (idToken: string) => {
    try {
      const result = await api.post<{ organizer: Organizer; token: string }>("/auth/google", {
        idToken,
      });
      setSession({
        role: "planner",
        organizerId: result.organizer.id,
        organizerName: result.organizer.name,
        token: result.token,
      });
      toast.success(`Welcome, ${result.organizer.name}`);
      void router.navigate({ to: "/planner" });
    } catch (err) {
      toast.error(errorMessage(err, "Google sign-in failed."));
    }
  };

  return (
    <main className="grid min-h-[100dvh] lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Wordmark className="text-xl [&_span:first-child]:text-primary-foreground" />
        <div className="max-w-sm space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            Put your events on the map, literally.
          </h1>
          <p className="text-sm text-primary-foreground/80">
            Publish flyer-image pins that people can find, filter and get directions to — no app
            download, no account needed on their end.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          Trusted by organizers across the Southwest and Littoral regions.
        </p>
      </section>

      <section className="flex flex-col items-center justify-center gap-6 px-4 py-10">
        <div className="text-center lg:hidden">
          <Wordmark className="text-2xl" />
          <p className="tracking-arch mt-2 text-[10px] text-muted-foreground">
            Event planner access
          </p>
        </div>

        <div className="w-full max-w-md space-y-4">
          {GOOGLE_SIGN_IN_ENABLED && (
            <>
              <GoogleSignInButton onCredential={(t) => void handleGoogleCredential(t)} />
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or continue with email
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <SignInForm
                onSubmit={async (email, password) => {
                  try {
                    const result = await api.post<{ organizer: Organizer; token: string }>(
                      "/auth/login",
                      { email, password },
                    );
                    setSession({
                      role: "planner",
                      organizerId: result.organizer.id,
                      organizerName: result.organizer.name,
                      token: result.token,
                    });
                    toast.success(`Welcome back, ${result.organizer.name}`);
                    void router.navigate({ to: "/planner" });
                  } catch (err) {
                    toast.error(errorMessage(err, "Sign in failed."));
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="register">
              <RegisterForm onDone={() => router.navigate({ to: "/planner" })} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            Back to the public map
          </Link>
          <PoweredBy />
        </div>
      </section>
    </main>
  );
}

function ForgotPasswordDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"email" | "code" | "newPassword">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetTicket, setResetTicket] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep("email");
    setEmail("");
    setCode("");
    setResetTicket("");
    setNewPassword("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Forgot password?
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset your password</DialogTitle>
          <DialogDescription>
            {step === "email" && "Enter your account email and we'll send a reset code."}
            {step === "code" && `Enter the 6-digit code sent to ${email}.`}
            {step === "newPassword" && "Choose a new password."}
          </DialogDescription>
        </DialogHeader>

        {step === "email" && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitting(true);
              void (async () => {
                try {
                  await api.post("/auth/forgot-password", { email });
                  toast.success("If that email is registered, a code is on its way.");
                  setStep("code");
                } catch (err) {
                  toast.error(errorMessage(err, "Something went wrong."));
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Sending…" : "Send reset code"}
            </Button>
          </form>
        )}

        {step === "code" && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitting(true);
              void (async () => {
                try {
                  const result = await api.post<{ resetTicket: string }>(
                    "/auth/verify-reset-code",
                    { email, code },
                  );
                  setResetTicket(result.resetTicket);
                  setStep("newPassword");
                } catch (err) {
                  toast.error(errorMessage(err, "Invalid or expired code."));
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="reset-code">6-digit code</Label>
              <Input
                id="reset-code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Verifying…" : "Verify code"}
            </Button>
          </form>
        )}

        {step === "newPassword" && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!passwordMeetsStrength(newPassword)) {
                toast.error("Password doesn't meet all the requirements yet.");
                return;
              }
              setSubmitting(true);
              void (async () => {
                try {
                  const result = await api.post<{ organizer: Organizer; token: string }>(
                    "/auth/reset-password",
                    { resetTicket, newPassword },
                  );
                  setSession({
                    role: "planner",
                    organizerId: result.organizer.id,
                    organizerName: result.organizer.name,
                    token: result.token,
                  });
                  toast.success("Password updated — you're signed in.");
                  setOpen(false);
                  void router.navigate({ to: "/planner" });
                } catch (err) {
                  toast.error(errorMessage(err, "Could not reset password."));
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <PasswordStrength password={newPassword} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SignInForm({
  onSubmit,
}: {
  onSubmit: (email: string, password: string) => void | Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="mt-4 space-y-4 rounded-2xl border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitting(true);
        void Promise.resolve(onSubmit(email, password)).finally(() => setSubmitting(false));
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <ForgotPasswordDialog />
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [channelType, setChannelType] = useState<ChannelType>("WhatsApp");
  const [channelValue, setChannelValue] = useState("");
  const [showPublicly, setShowPublicly] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="mt-4 space-y-4 rounded-2xl border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!channelValue.trim()) {
          toast.error("At least one contact channel is required for verification.");
          return;
        }
        if (!passwordMeetsStrength(password)) {
          toast.error("Password doesn't meet all the requirements yet.");
          return;
        }
        setSubmitting(true);
        void (async () => {
          try {
            const result = await api.post<{ organizer: Organizer; token: string }>(
              "/auth/register",
              {
                name,
                email,
                password,
                bio,
                channels: [{ type: channelType, value: channelValue.trim() }],
                showContactsPublicly: showPublicly,
              },
            );
            setSession({
              role: "planner",
              organizerId: result.organizer.id,
              organizerName: result.organizer.name,
              token: result.token,
            });
            toast.success("Account created. Status: Pending Verification.");
            onDone();
          } catch (err) {
            toast.error(errorMessage(err, "Registration failed."));
          } finally {
            setSubmitting(false);
          }
        })();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="org-name">Organizer name</Label>
        <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reg-email">Email</Label>
          <Input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-password">Password</Label>
          <Input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>
      <PasswordStrength password={password} />
      <div className="space-y-2">
        <Label htmlFor="bio">Short description</Label>
        <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={2} />
      </div>

      <div className="space-y-2 rounded-xl border bg-muted/40 p-3">
        <p className="text-sm font-medium">Verification contact</p>
        <p className="text-xs text-muted-foreground">
          Used only by administrators to verify you. Never shown publicly unless you opt in.
        </p>
        <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
          <Select value={channelType} onValueChange={(v) => setChannelType(v as ChannelType)}>
            <SelectTrigger aria-label="Contact channel type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={channelValue}
            onChange={(e) => setChannelValue(e.target.value)}
            placeholder="Number, address or profile URL"
            aria-label="Contact channel value"
            required
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <Label htmlFor="show-public" className="text-xs font-normal">
            Show this contact on my public profile
          </Label>
          <Switch id="show-public" checked={showPublicly} onCheckedChange={setShowPublicly} />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Creating account…" : "Create planner account"}
      </Button>
    </form>
  );
}
