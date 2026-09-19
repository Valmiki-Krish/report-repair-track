import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ArrowBigUp, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CategoryBadge, StatusBadge } from "@/components/StatusBadge";
import {
  STATUSES,
  fetchReport,
  isStatus,
  relativeTime,
  uploadPhoto,
  upvoteReport,
  type Status,
} from "@/lib/reports";

export const Route = createFileRoute("/report/$id")({
  head: () => ({
    meta: [
      { title: "Report Details — FixTrack" },
      {
        name: "description",
        content:
          "Follow this civic issue through every stage: reported, assigned to a contractor, repaired with photo proof, and verified.",
      },
      { property: "og:title", content: "Report Details — FixTrack" },
      {
        property: "og:description",
        content: "Follow this civic issue from report through to a verified repair.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportDetail,
});

function ReportDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const afterInput = useRef<HTMLInputElement>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: report, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: () => fetchReport(id),
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["report", id] });
    await queryClient.invalidateQueries({ queryKey: ["reports"] });
  }

  async function update(patch: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await supabase.from("reports").update(patch).eq("id", id);
      if (e) throw e;
      await refresh();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitRepair() {
    if (!afterFile) {
      setError("Choose an 'after' repair photo first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const url = await uploadPhoto(afterFile, "after");
      const { error: e } = await supabase
        .from("reports")
        .update({ after_photo_url: url, status: "Repaired" })
        .eq("id", id);
      if (e) throw e;
      setAfterFile(null);
      await refresh();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return <p className="p-16 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-lg p-16 text-center">
        <h1 className="text-xl font-semibold">Report not found</h1>
        <Link to="/dashboard" className="mt-4 inline-block text-sm font-semibold text-primary underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const status: Status = isStatus(report.status) ? report.status : "Reported";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground">
        ← Back to dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CategoryBadge category={report.category} />
        <StatusBadge status={status} />
        <span className="text-sm text-muted-foreground">
          reported {relativeTime(report.created_at)}
        </span>
      </div>

      {status === "Reported" || status === "Assigned" ? (
        <img
          src={report.photo_url}
          alt="Reported issue"
          className="mt-4 max-h-[26rem] w-full rounded-2xl border border-border object-cover"
        />
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <figure>
            <img
              src={report.photo_url}
              alt="Before repair"
              className="h-56 w-full rounded-2xl border border-border object-cover"
            />
            <figcaption className="mt-1 text-center text-xs font-semibold text-muted-foreground">
              Before
            </figcaption>
          </figure>
          <figure>
            <img
              src={report.after_photo_url ?? report.photo_url}
              alt="After repair"
              className="h-56 w-full rounded-2xl border border-border object-cover"
            />
            <figcaption className="mt-1 text-center text-xs font-semibold text-muted-foreground">
              After
            </figcaption>
          </figure>
        </div>
      )}

      {status === "Verified" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-status-verified px-4 py-3 text-status-verified-foreground">
          <ShieldCheck className="size-5" />
          <span className="font-semibold">Verified ✓</span>
          <span className="text-sm opacity-80">
            {report.verified_at
              ? `on ${new Date(report.verified_at).toLocaleString()}`
              : ""}
          </span>
        </div>
      ) : null}

      <div className="card-surface mt-5 space-y-3 p-5">
        <p className="text-sm">{report.description || "No description provided."}</p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Row label="Location">
            {report.address ??
              `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`}
          </Row>
          <Row label="Coordinates">
            {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
          </Row>
          <Row label="Submitted">{new Date(report.created_at).toLocaleString()}</Row>
          <Row label="Reported by">{report.reporter_name ?? "Anonymous"}</Row>
        </dl>
        <button
          type="button"
          onClick={async () => {
            await upvoteReport(report.id);
            await refresh();
          }}
          className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <ArrowBigUp className="size-4" />
          {report.upvotes} upvote{report.upvotes === 1 ? "" : "s"}
        </button>
      </div>

      <Timeline current={status} />

      <div className="card-surface mt-5 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Demo Admin Controls
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Open to everyone in this hackathon MVP. In production these would sit behind a
          municipal login.
        </p>

        <div className="mt-4 space-y-4">
          {status === "Reported" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void update({ status: "Assigned" })}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Mark as Assigned to Contractor
            </button>
          ) : null}

          {status === "Assigned" ? (
            <div className="space-y-3">
              <label className="block text-sm font-semibold">After repair photo</label>
              <input
                ref={afterInput}
                type="file"
                accept="image/*"
                onChange={(e) => setAfterFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-semibold"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitRepair()}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {busy ? "Uploading…" : "Submit Repair Photo & Mark Repaired"}
              </button>
            </div>
          ) : null}

          {status === "Repaired" ? (
            <div className="rounded-xl border border-border bg-secondary p-4">
              <p className="text-sm font-semibold">Verification: Pending CV Check</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A reviewer compares the before and after photos to confirm the repair is
                real.
              </p>
              <button
                type="button"
                disabled={busy}
                // TODO: replace with automated CV verification call
                onClick={() =>
                  void update({ status: "Verified", verified_at: new Date().toISOString() })
                }
                className="mt-3 flex items-center gap-2 rounded-xl bg-status-verified-foreground px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Mark as Verified
              </button>
            </div>
          ) : null}

          {status === "Verified" ? (
            <p className="text-sm text-muted-foreground">
              This report is fully closed. No further action needed.
            </p>
          ) : null}

          {error ? (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function Timeline({ current }: { current: Status }) {
  const index = STATUSES.indexOf(current);
  return (
    <div className="card-surface mt-5 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Progress
      </h2>
      <ol className="mt-4 flex items-start">
        {STATUSES.map((s, i) => {
          const done = i <= index;
          return (
            <li key={s} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span
                  className={`h-0.5 flex-1 ${i === 0 ? "bg-transparent" : done ? "bg-primary" : "bg-border"}`}
                />
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`h-0.5 flex-1 ${
                    i === STATUSES.length - 1
                      ? "bg-transparent"
                      : i < index
                        ? "bg-primary"
                        : "bg-border"
                  }`}
                />
              </div>
              <span
                className={`mt-2 text-xs font-semibold ${
                  i === index ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {s}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
