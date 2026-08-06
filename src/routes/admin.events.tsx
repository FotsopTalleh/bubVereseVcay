import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import { formatEventDate } from "@/lib/directions";
import type { EventRecord, EventStatus, ModerationLog, Organizer } from "@/lib/types";

export const Route = createFileRoute("/admin/events")({
  component: AdminEvents,
});

function AdminEvents() {
  const queryClient = useQueryClient();
  const { data: events = [] } = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => api.get<EventRecord[]>("/admin/events"),
  });
  const { data: organizers = [] } = useQuery({
    queryKey: ["admin-organizers"],
    queryFn: () => api.get<Organizer[]>("/admin/organizers"),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["admin-moderation-logs"],
    queryFn: () => api.get<ModerationLog[]>("/admin/moderation-logs"),
  });

  const [pending, setPending] = useState<{ id: string; status: EventStatus } | null>(null);
  const [reason, setReason] = useState("");

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-moderation-logs"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
  };

  const moderateMutation = useMutation({
    mutationFn: ({ id, status, reason: r }: { id: string; status: EventStatus; reason: string }) =>
      api.patch(`/admin/events/${id}/moderate`, { status, reason: r }),
    onSuccess: (_data, variables) => {
      toast.success(`Event set to ${variables.status}`);
      invalidateAll();
      setPending(null);
      setReason("");
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Could not update event."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => {
      toast.success("Event deleted");
      invalidateAll();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Could not delete event."),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">All events</h2>
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Organizer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Pin</TableHead>
              <TableHead className="text-right">Directions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">{event.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {organizers.find((o) => o.id === event.organizerId)?.name ?? "Unknown"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatEventDate(event.date)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      event.status === "Published"
                        ? "default"
                        : event.status === "Removed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {event.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{event.pinClicks}</TableCell>
                <TableCell className="text-right tabular-nums">{event.directionClicks}</TableCell>
                <TableCell className="space-x-2 text-right">
                  {event.status !== "Unpublished" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPending({ id: event.id, status: "Unpublished" })}
                    >
                      Unpublish
                    </Button>
                  )}
                  {event.status !== "Published" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPending({ id: event.id, status: "Published" })}
                    >
                      Publish
                    </Button>
                  )}
                  {event.status !== "Removed" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPending({ id: event.id, status: "Removed" })}
                    >
                      Remove
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(event.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Moderation log</h2>
        {logs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No moderation actions recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {logs.map((log) => (
              <li key={log.id} className="rounded-xl border bg-muted/40 px-3 py-2">
                <p className="font-medium">
                  {log.eventTitle} — {log.action}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(log.at).toLocaleString()} · Reason: {log.reason}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
            setReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reason required</DialogTitle>
            <DialogDescription>
              Every status change is logged against the event for accountability.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Fraudulent listing, duplicate, inappropriate…"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!pending || !reason.trim()) {
                  toast.error("A reason is required.");
                  return;
                }
                moderateMutation.mutate({
                  id: pending.id,
                  status: pending.status,
                  reason: reason.trim(),
                });
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
