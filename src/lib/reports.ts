import { supabase } from "@/integrations/supabase/client";

export const CATEGORIES = [
  "Pothole",
  "Streetlight",
  "Garbage",
  "Flooding",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ["Reported", "Assigned", "Repaired", "Verified"] as const;
export type Status = (typeof STATUSES)[number];

export type Report = {
  id: string;
  photo_url: string;
  after_photo_url: string | null;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  address: string | null;
  status: string;
  reporter_name: string | null;
  upvotes: number;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export const STATUS_COLORS: Record<Status, string> = {
  Reported: "#94a3b8",
  Assigned: "#f59e0b",
  Repaired: "#2563eb",
  Verified: "#10b981",
};

export const statusBadgeClass: Record<Status, string> = {
  Reported: "bg-status-reported text-status-reported-foreground",
  Assigned: "bg-status-assigned text-status-assigned-foreground",
  Repaired: "bg-status-repaired text-status-repaired-foreground",
  Verified: "bg-status-verified text-status-verified-foreground",
};

export function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  return `${Math.round(months / 12)} year${months < 24 ? "" : "s"} ago`;
}

const TEN_YEARS_SECONDS = 315_360_000;

/** Uploads a photo to storage and returns a long-lived readable URL. */
export async function uploadPhoto(file: File, prefix: "before" | "after") {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("report-photos")
    .upload(path, file, { cacheControl: "31536000", upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.storage
    .from("report-photos")
    .createSignedUrl(path, TEN_YEARS_SECONDS);
  if (error || !data?.signedUrl) throw error ?? new Error("Could not read photo back");
  return data.signedUrl;
}

export async function fetchReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Report[];
}

export async function fetchReport(id: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Report | null) ?? null;
}

export async function upvoteReport(id: string) {
  const { data, error } = await supabase.rpc("upvote_report", { report_id: id });
  if (error) throw error;
  return data as number;
}

/** Reverse geocode with OpenStreetMap Nominatim. Best effort — never throws. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { display_name?: string };
    return json.display_name ?? null;
  } catch {
    return null;
  }
}
