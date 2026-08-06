import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api, ApiError } from "@/lib/api";
import {
  ORGANIZER_STATUSES,
  type EventRecord,
  type Organizer,
  type OrganizerStatus,
} from "@/lib/types";

export const Route = createFileRoute("/admin/organizers")({
  component: AdminOrganizers,
});

const statusVariant = (status: OrganizerStatus) =>
  status === "Verified"
    ? "default"
    : status === "Rejected" || status === "Suspended"
      ? "destructive"
      : "secondary";

function AdminOrganizers() {
  const queryClient = useQueryClient();
  const { data: organizers = [] } = useQuery({
    queryKey: ["admin-organizers"],
    queryFn: () => api.get<Organizer[]>("/admin/organizers"),
  });
  const { data: events = [] } = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => api.get<EventRecord[]>("/admin/events"),
  });

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-organizers"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrganizerStatus }) =>
      api.patch(`/admin/organizers/${id}/status`, { status }),
    onSuccess: (_data, variables) => {
      toast.success(`Organizer set to ${variables.status}`);
      invalidateAll();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Could not update status."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/organizers/${id}`),
    onSuccess: () => {
      toast.success("Organizer deleted");
      invalidateAll();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Could not delete organizer."),
  });

  return (
    <div className="space-y-3">
      {organizers.map((organizer) => (
        <article key={organizer.id} className="rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-medium">{organizer.name}</h2>
                <Badge variant={statusVariant(organizer.status)}>{organizer.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {organizer.email} · joined {organizer.createdAt} ·{" "}
                {events.filter((e) => e.organizerId === organizer.id).length} events
              </p>
              {organizer.bio && <p className="mt-2 text-sm">{organizer.bio}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={organizer.status}
                onValueChange={(value) =>
                  statusMutation.mutate({ id: organizer.id, status: value as OrganizerStatus })
                }
              >
                <SelectTrigger className="w-56" aria-label={`Status for ${organizer.name}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORGANIZER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${organizer.name}`}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {organizer.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the organizer, all of their events and the associated
                      interest data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMutation.mutate(organizer.id)}>
                      Delete permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="mt-3 rounded-xl border bg-muted/40 p-3">
            <p className="tracking-arch text-[10px] text-muted-foreground">Verification contacts</p>
            <ul className="mt-2 space-y-1 text-sm">
              {organizer.channels.map((channel, index) => (
                <li key={`${channel.type}-${index}`} className="flex gap-3">
                  <span className="w-32 shrink-0 text-muted-foreground">{channel.type}</span>
                  <span className="truncate">{channel.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>
      ))}
    </div>
  );
}
