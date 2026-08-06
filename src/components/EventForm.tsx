import { useState } from "react";
import { toast } from "sonner";
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
import { LocationPicker } from "@/components/LocationPicker";
import { CATEGORIES, type Category, type EventRecord, type EventStatus } from "@/lib/types";
import type { EventDraft } from "@/lib/store";

type Props = {
  organizerId: string;
  initial?: EventRecord | undefined;
  submitLabel: string;
  onSubmit: (draft: EventDraft) => void;
};

export function EventForm({ organizerId, initial, submitLabel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "Music");
  const [date, setDate] = useState(initial?.date ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "18:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "22:00");
  const [venueName, setVenueName] = useState(initial?.venueName ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [status, setStatus] = useState<EventStatus>(initial?.status ?? "Published");
  const [lat, setLat] = useState<number | null>(initial?.lat ?? null);
  const [lng, setLng] = useState<number | null>(initial?.lng ?? null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (lat == null || lng == null) {
          toast.error("Drop a pin on the map to set the venue location.");
          return;
        }
        if (!image) {
          toast.error("A flyer or banner image is required.");
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
          image,
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
          <Label htmlFor="flyer">Flyer / banner image</Label>
          <Input
            id="flyer"
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {image && (
            <img
              src={image}
              alt="Flyer preview"
              loading="lazy"
              className="mt-2 h-40 w-32 rounded-lg border object-cover"
            />
          )}
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="venue">Venue name</Label>
            <Input
              id="venue"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Physical address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
        </div>
        <LocationPicker
          lat={lat}
          lng={lng}
          onChange={(nextLat, nextLng) => {
            setLat(nextLat);
            setLng(nextLng);
          }}
        />
      </section>

      <Button type="submit" size="lg">
        {submitLabel}
      </Button>
    </form>
  );
}
