import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PoweredBy, Wordmark } from "@/components/brand";
import { hydrateStore, loginAdmin, loginPlanner, registerPlanner } from "@/lib/store";
import { CHANNEL_TYPES, type ChannelType } from "@/lib/types";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Planner & Admin Sign In — BubVerseVacy" },
      {
        name: "description",
        content:
          "Sign in or register as an event planner to publish events to the BubVerseVacy map, or sign in as an administrator.",
      },
      { property: "og:title", content: "Planner & Admin Sign In — BubVerseVacy" },
      {
        property: "og:description",
        content: "Access the planner dashboard or the BubVerseVacy admin console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  useEffect(() => hydrateStore(), []);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <Wordmark className="text-2xl" />
        <p className="tracking-arch mt-2 text-[10px] text-muted-foreground">
          Planner &amp; administrator access
        </p>
      </div>

      <Tabs defaultValue="signin" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          <SignInForm
            onSubmit={(email, password) => {
              const result = loginPlanner(email, password);
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success(`Welcome back, ${result.organizer.name}`);
              void router.navigate({ to: "/planner" });
            }}
            hint="Demo planner: planner@bubverse.app / planner123"
          />
        </TabsContent>

        <TabsContent value="register">
          <RegisterForm onDone={() => router.navigate({ to: "/planner" })} />
        </TabsContent>

        <TabsContent value="admin">
          <SignInForm
            onSubmit={(email, password) => {
              const result = loginAdmin(email, password);
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success("Signed in as administrator");
              void router.navigate({ to: "/admin" });
            }}
            hint="Demo admin: admin@bubverse.app / admin123"
          />
        </TabsContent>
      </Tabs>

      <div className="flex flex-col items-center gap-2">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
          Back to the public map
        </Link>
        <PoweredBy />
      </div>
    </main>
  );
}

function SignInForm({
  onSubmit,
  hint,
}: {
  onSubmit: (email: string, password: string) => void;
  hint: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      className="mt-4 space-y-4 rounded-2xl border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(email, password);
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
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Sign in
      </Button>
      <p className="text-center text-xs text-muted-foreground">{hint}</p>
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

  return (
    <form
      className="mt-4 space-y-4 rounded-2xl border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!channelValue.trim()) {
          toast.error("At least one contact channel is required for verification.");
          return;
        }
        const result = registerPlanner({
          name,
          email,
          password,
          bio,
          channels: [{ type: channelType, value: channelValue.trim() }],
          showContactsPublicly: showPublicly,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Account created. Status: Pending Verification.");
        onDone();
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>
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

      <Button type="submit" className="w-full">
        Create planner account
      </Button>
    </form>
  );
}
