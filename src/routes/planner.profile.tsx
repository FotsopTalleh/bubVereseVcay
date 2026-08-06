import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api";
import { clearSession } from "@/lib/session";
import { CHANNEL_TYPES, type ChannelType, type ContactChannel, type Organizer } from "@/lib/types";

export const Route = createFileRoute("/planner/profile")({
  component: PlannerProfile,
});

function PlannerProfile() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: organizer } = useQuery({
    queryKey: ["planner-profile"],
    queryFn: () => api.get<Organizer>("/planner/profile"),
  });

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [channels, setChannels] = useState<ContactChannel[]>([]);
  const [showPublicly, setShowPublicly] = useState(false);
  const [newType, setNewType] = useState<ChannelType>("Email");
  const [newValue, setNewValue] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (organizer && !hydrated) {
      setName(organizer.name);
      setBio(organizer.bio ?? "");
      setChannels(organizer.channels);
      setShowPublicly(organizer.showContactsPublicly);
      setHydrated(true);
    }
  }, [organizer, hydrated]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.patch<Organizer>("/planner/profile", {
        name,
        bio,
        channels,
        showContactsPublicly: showPublicly,
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      void queryClient.invalidateQueries({ queryKey: ["planner-profile"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Could not update profile."),
  });

  if (!organizer) return null;

  return (
    <form
      className="max-w-2xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (channels.length === 0) {
          toast.error("Keep at least one contact channel for verification.");
          return;
        }
        updateMutation.mutate();
      }}
    >
      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Organizer profile</h2>
          <Badge variant="secondary">{organizer.status}</Badge>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">About</Label>
          <Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold">Verification contacts</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Used by administrators to verify you. Hidden from the public unless you opt in below.
          </p>
        </div>

        <ul className="space-y-2">
          {channels.map((channel, index) => (
            <li
              key={`${channel.type}-${index}`}
              className="flex items-center gap-3 rounded-xl border bg-muted/40 px-3 py-2 text-sm"
            >
              <span className="tracking-arch w-32 shrink-0 text-[10px] text-muted-foreground">
                {channel.type}
              </span>
              <span className="flex-1 truncate">{channel.value}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${channel.type}`}
                onClick={() => setChannels(channels.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>

        <div className="grid gap-3 sm:grid-cols-[9rem_1fr_auto]">
          <Select value={newType} onValueChange={(v) => setNewType(v as ChannelType)}>
            <SelectTrigger aria-label="New channel type">
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
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Number, address or profile URL"
            aria-label="New channel value"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!newValue.trim()) return;
              setChannels([...channels, { type: newType, value: newValue.trim() }]);
              setNewValue("");
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </Button>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <Label htmlFor="public-contacts" className="text-sm font-normal">
            Show my first contact on the public event detail view
          </Label>
          <Switch id="public-contacts" checked={showPublicly} onCheckedChange={setShowPublicly} />
        </div>
      </section>

      <Button type="submit">Save profile</Button>

      <div className="flex items-center justify-between rounded-2xl border bg-card p-5">
        <div>
          <p className="text-sm font-medium">Sign out</p>
          <p className="text-xs text-muted-foreground">End your planner session on this device.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            clearSession();
            void router.navigate({ to: "/auth" });
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </form>
  );
}
