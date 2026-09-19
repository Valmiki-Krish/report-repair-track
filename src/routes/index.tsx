import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { Camera, Crosshair, CheckCircle2, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PickerMap } from "@/components/map";
import { CATEGORIES, reverseGeocode, uploadPhoto } from "@/lib/reports";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Report a Civic Issue — FixTrack" },
      {
        name: "description",
        content:
          "Snap a photo, drop a pin, and report a pothole or civic issue in under a minute. Track it from report to verified repair.",
      },
      { property: "og:title", content: "Report a Civic Issue — FixTrack" },
      {
        property: "og:description",
        content:
          "Snap a photo, drop a pin, and report a pothole or civic issue in under a minute.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("Pothole");
  const [reporterName, setReporterName] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  function pickFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    pickFile(e.dataTransfer.files?.[0]);
  }

  function onInput(e: ChangeEvent<HTMLInputElement>) {
    pickFile(e.target.files?.[0]);
  }

  async function setPin(lat: number, lng: number) {
    setCoords({ lat, lng });
    const found = await reverseGeocode(lat, lng);
    if (found) setAddress(found);
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setError("Your browser can't share location. Drop a pin on the map instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setError(null);
        void setPin(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Tap the map to drop a pin instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit() {
    if (!file) {
      setError("A photo of the issue is required.");
      return;
    }
    if (!coords) {
      setError("Please set a location — use the button or drop a pin on the map.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const photoUrl = await uploadPhoto(file, "before");
      const { data, error: insertError } = await supabase
        .from("reports")
        .insert({
          photo_url: photoUrl,
          description: description.trim(),
          category,
          latitude: coords.lat,
          longitude: coords.lng,
          address: address.trim() || null,
          status: "Reported",
          reporter_name: reporterName.trim() || null,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      setCreatedId(data.id as string);
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "Something went wrong submitting your report.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (createdId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="card-surface p-8">
          <CheckCircle2 className="mx-auto size-14 text-status-verified-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Report submitted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your issue is now logged as <strong>Reported</strong>. You can follow it all
            the way through to a verified repair.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/dashboard"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
            >
              View on Dashboard
            </Link>
            <Link
              to="/report/$id"
              params={{ id: createdId }}
              className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              Track this report
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Report an issue</h1>
      <p className="mt-2 text-muted-foreground">
        A photo and a location are all it takes. You'll be able to track the repair from
        start to verified finish.
      </p>

      <div className="card-surface mt-6 space-y-6 p-5 sm:p-6">
        {/* Photo */}
        <div>
          <label className="text-sm font-semibold">Photo of the issue *</label>
          {preview ? (
            <div className="relative mt-2 overflow-hidden rounded-xl border border-border">
              <img src={preview} alt="Selected" className="h-60 w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="absolute right-3 top-3 rounded-full bg-card/90 p-2 shadow-md"
                aria-label="Remove photo"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInput.current?.click()}
              className="mt-2 flex h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/50 text-center transition-colors hover:border-primary hover:bg-secondary"
            >
              <Camera className="size-7 text-muted-foreground" />
              <p className="text-sm font-medium">Tap to upload or drag a photo here</p>
              <p className="text-xs text-muted-foreground">JPG or PNG, up to 10 MB</p>
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onInput}
          />
        </div>

        {/* Location */}
        <div>
          <label className="text-sm font-semibold">Location *</label>
          <button
            type="button"
            onClick={useMyLocation}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 sm:w-auto"
          >
            {locating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Crosshair className="size-4" />
            )}
            Use my current location
          </button>
          <div className="mt-3 h-64 overflow-hidden rounded-xl border border-border">
            <PickerMap
              lat={coords?.lat ?? 20.5937}
              lng={coords?.lng ?? 78.9629}
              hasPin={!!coords}
              onPick={(lat, lng) => void setPin(lat, lng)}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {coords
              ? `Pin set at ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} — drag it to adjust.`
              : "Tap anywhere on the map to drop a pin."}
          </p>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address (optional)"
            className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-semibold">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue..."
            rows={4}
            maxLength={1000}
            className="mt-2 w-full resize-none rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Name</label>
            <input
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="Your name (optional)"
              maxLength={100}
              className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitting ? "Uploading your photo…" : "Submit report"}
        </button>
      </div>
    </div>
  );
}
