import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  retrying: boolean;
  retryFailed: boolean;
  onRetry: () => void;
  onDismiss: () => void;
};

/** Some mobile browsers (iOS Safari in particular) don't reliably surface
 * the native location permission prompt for a `watchPosition` call fired on
 * page load, the request just silently goes nowhere. Re-requesting from
 * inside a click handler (this dialog's "Allow location" button) reliably
 * triggers it, since it's now a direct response to a user gesture. Only
 * shown once we've actually failed to get a fix, never proactively. */
export function LocationPermissionDialog({
  open,
  retrying,
  retryFailed,
  onRetry,
  onDismiss,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDismiss()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle className="text-center">Turn on location</DialogTitle>
          <DialogDescription className="text-center">
            {retryFailed
              ? "Still couldn't get your location. Check that location access is allowed for this site in your browser or device settings, then try again."
              : "BubVerseVacy uses your location to center the map near you and to calculate live directions to events."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-center">
          <Button variant="outline" onClick={onDismiss} className="sm:flex-1">
            Not now
          </Button>
          <Button onClick={onRetry} disabled={retrying} className="sm:flex-1">
            {retrying ? "Requesting…" : "Allow location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
