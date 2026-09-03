import { lazy, Suspense, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import { TOWNS } from "@/components/map/mapConfig";
import { CATEGORIES, type Category, type EventRecord, type EventStatus } from "@/lib/types";

// Loaded only in the browser, see LocationPicker.tsx's default export.
const LocationPicker = lazy(() => import("@/components/LocationPicker"));
const PICKER_FALLBACK = <div className="h-72 w-full rounded-xl border bg-muted" />;

const MAX_IMAGES = 5;

export type EventDraft = Omit<
  EventRecord,
  | "id"
  | "pinClicks"
  | "directionClicks"
  | "shareCount"
  | "linkClicks"
  | "createdAt"
  | "updatedAt"
  | "history"
>;

type UploadSignature = {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
};

type Props = {
  organizerId: string;
  initial?: EventRecord | undefined;
  submitLabel: string;
  onSubmit: (draft: EventDraft) => void;
};

async function uploadToCloudinary(file: File, sign: UploadSignature): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sign.apiKey);
  formData.append("timestamp", String(sign.timestamp));
  formData.append("signature", sign.signature);
  formData.append("folder", sign.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  const uploaded = (await res.json()) as { secure_url: string };
  return uploaded.secure_url;
}

export function EventForm({ organizerId, initial, submitLabel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "Music");
  const [date, setDate] = useState(initial?.date ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "18:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "22:00");
  const [venueName, setVenueName] = useState(initial?.venueName ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [onlineMeetingUrl, setOnlineMeetingUrl] = useState(initial?.onlineMeetingUrl ?? "");
  const [attendanceFormUrl, setAttendanceFormUrl] = useState(initial?.attendanceFormUrl ?? "");
  const [images, setImages] = useState<string[]>(
    initial?.images && initial.images.length > 0
      ? initial.images
      : initial?.flyerImageUrl
        ? [initial.flyerImageUrl]
        : [],
  );
  const [status, setStatus] = useState<EventStatus>(initial?.status ?? "Published");
  const [lat, setLat] = useState<number | null>(initial?.lat ?? null);
  const [lng, setLng] = useState<number | null>(initial?.lng ?? null);
  const [town, setTown] = useState("");
  const [focusCenter, setFocusCenter] = useState<[number, number] | undefined>(undefined);
  const [uploadingCount, setUploadingCount] = useState(0);
  const uploading = uploadingCount > 0;

  const handleTownChange = (name: string) => {
    setTown(name);
    const found = TOWNS.find((t) => t.name === name);
    if (found) {
      setFocusCenter(found.center);
      setLat(null);
      setLng(null);
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`You can upload up to ${MAX_IMAGES} images.`);
      return;
    }
    const files = Array.from(fileList).slice(0, remaining);
    if (fileList.length > remaining) {
      toast.error(
        `Only ${remaining} more image${remaining === 1 ? "" : "s"} allowed (max ${MAX_IMAGES}).`,
      );
    }

    setUploadingCount((n) => n + files.length);
    try {
      const sign = await api.post<UploadSignature>("/uploads/sign");
      const results = await Promise.allSettled(files.map((file) => uploadToCloudinary(file, sign)));
      const succeeded = results.filter(
        (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled",
      );
      const failedCount = results.length - succeeded.length;
      if (succeeded.length > 0) {
        setImages((prev) => [...prev, ...succeeded.map((r) => r.value)]);
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} image${failedCount === 1 ? "" : "s"} failed to upload.`);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Image upload failed. Try again.");
    } finally {
      setUploadingCount((n) => n - files.length);
    }
  };

  const removeImage = (url: string) => setImages((prev) => prev.filter((u) => u !== url));

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (lat == null || lng == null) {
          toast.error("Drop a pin on the map to set the venue location.");
          return;
        }
        if (images.length === 0) {
          toast.error("At least one event image is required.");
          return;
        }
        if (uploading) {
          toast.error("Wait for the image upload to finish.");
          return;
        }
        onSubmit({
          title,
          description,
          category,
          date,
          startTime,
          endTime,
          venueName,
          address,
          onlineMeetingUrl: onlineMeetingUrl.trim(),
          attendanceFormUrl: attendanceFormUrl.trim(),
          flyerImageUrl: images[0]!,
          images,
          status,
          lat,
          lng,
          organizerId,
        });
      }}
    >
      <section className="grid gap-4 rounded-2xl border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger aria-label="Category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as EventStatus)}>
              <SelectTrigger aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Published">Published</SelectItem>
                <SelectItem value="Unpublished">Unpublished</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start">Start time</Label>
            <Input
              id="start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">End time</Label>
            <Input
              id="end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="images">
            Event images ({images.length}/{MAX_IMAGES})
          </Label>
          <Input
            id="images"
            type="file"
            accept="image/*"
            multiple
            disabled={uploading || images.length >= MAX_IMAGES}
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
          <p className="text-xs text-muted-foreground">
            Add at least 1 image, up to {MAX_IMAGES}. The first is used as the map pin thumbnail.
          </p>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {images.map((url) => (
                <div key={url} className="relative h-24 w-24 shrink-0">
                  <img
                    src={url}
                    alt="Event"
                    loading="lazy"
                    className="h-full w-full rounded-lg border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    aria-label="Remove image"
                    className="absolute -right-2 -top-2 rounded-full border bg-background p-1 text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border bg-card p-5">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Location</h2>
          <p className="text-xs text-muted-foreground">
            Pick your town to jump the map there, then tap the map to drop a pin at the exact venue.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Town</Label>
          <Select value={town} onValueChange={handleTownChange}>
            <SelectTrigger aria-label="Town">
              <SelectValue placeholder="Select your town" />
            </SelectTrigger>
            <SelectContent>
              {TOWNS.map((t) => (
                <SelectItem key={t.name} value={t.name}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="venue">Venue name</Label>
            <Input
              id="venue"
              placeholder='e.g. "Molyko Open Arena"'
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              The name attendees will recognize, shown as the event&apos;s location title.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Physical address</Label>
            <Input
              id="address"
              placeholder='e.g. "Molyko Street, Buea, Southwest Region"'
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Street or locality description, for people who don&apos;t know the venue by name.
            </p>
          </div>
        </div>
        <ClientOnly fallback={PICKER_FALLBACK}>
          <Suspense fallback={PICKER_FALLBACK}>
            <LocationPicker
              lat={lat}
              lng={lng}
              focusCenter={focusCenter}
              onChange={(nextLat, nextLng) => {
                setLat(nextLat);
                setLng(nextLng);
              }}
            />
          </Suspense>
        </ClientOnly>
      </section>

      <section className="grid gap-4 rounded-2xl border bg-card p-5">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Online (optional)</h2>
          <p className="text-xs text-muted-foreground">
            For hybrid or fully online events. Both links are optional and shown to attendees
            alongside the venue.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="online-meeting-url">Online meeting link</Label>
            <Input
              id="online-meeting-url"
              type="url"
              placeholder="https://meet.google.com/..."
              value={onlineMeetingUrl}
              onChange={(e) => setOnlineMeetingUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Lets attendees join the meeting directly from the event page.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="attendance-form-url">Attendance form link</Label>
            <Input
              id="attendance-form-url"
              type="url"
              placeholder="https://forms.gle/..."
              value={attendanceFormUrl}
              onChange={(e) => setAttendanceFormUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A form (e.g. Google Forms) for tracking who checked in.
            </p>
          </div>
        </div>
      </section>

      <Button type="submit" size="lg" disabled={uploading}>
        {submitLabel}
      </Button>
    </form>
  );
}
