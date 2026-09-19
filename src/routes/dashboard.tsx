import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowBigUp, List, Map as MapIcon } from "lucide-react";
import { ReportsMap } from "@/components/map";
import { CategoryBadge, StatusBadge } from "@/components/StatusBadge";
import {
  CATEGORIES,
  STATUSES,
  fetchReports,
  relativeTime,
  upvoteReport,
  type Report,
} from "@/lib/reports";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Public Dashboard — FixTrack Civic Issues" },
      {
        name: "description",
        content:
          "Browse every reported civic issue on a live map or as cards, filter by status and category, and upvote the repairs your area needs most.",
      },
      { property: "og:title", content: "Public Dashboard — FixTrack" },
      {
        property: "og:description",
        content:
          "Every reported civic issue on a live map, from Reported through to Verified.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient();
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: fetchReports,
  });

  const [view, setView] = useState<"map" | "list">("list");
  const [status, setStatus] = useState<string>("All");
  const [category, setCategory] = useState<string>("All");
  const [sort, setSort] = useState<"newest" | "upvotes">("newest");

  const visible = useMemo(() => {
    const out = reports.filter(
      (r) =>
        (status === "All" || r.status === status) &&
        (category === "All" || r.category === category),
    );
    return out.sort((a, b) =>
      sort === "upvotes"
        ? b.upvotes - a.upvotes
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [reports, status, category, sort]);

  async function onUpvote(id: string) {
    await upvoteReport(id);
    await queryClient.invalidateQueries({ queryKey: ["reports"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Public dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {reports.length} issue{reports.length === 1 ? "" : "s"} reported so far
          </p>
        </div>
        <div className="flex rounded-xl border border-border bg-card p-1">
          {(
            [
              ["map", "Map View", MapIcon],
              ["list", "List View", List],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                view === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-surface mt-5 flex flex-wrap gap-3 p-3">
        <Select label="Status" value={status} onChange={setStatus} options={["All", ...STATUSES]} />
        <Select
          label="Category"
          value={category}
          onChange={setCategory}
          options={["All", ...CATEGORIES]}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "newest" | "upvotes")}
            className="rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="newest">Newest first</option>
            <option value="upvotes">Most upvoted</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Loading reports…</p>
      ) : visible.length === 0 ? (
        <EmptyState hasAny={reports.length > 0} />
      ) : view === "map" ? (
        <div className="mt-5 h-[70vh] overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-card)]">
          <ReportsMap reports={visible} />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r) => (
            <ReportCard key={r.id} report={r} onUpvote={() => void onUpvote(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="card-surface mt-6 p-10 text-center">
      <p className="text-lg font-semibold">
        {hasAny ? "Nothing matches those filters" : "No reports yet"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasAny
          ? "Try widening the status or category filter."
          : "Be the first to report an issue in your area!"}
      </p>
      {!hasAny ? (
        <Link
          to="/"
          className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Report an issue
        </Link>
      ) : null}
    </div>
  );
}

function ReportCard({ report, onUpvote }: { report: Report; onUpvote: () => void }) {
  return (
    <div className="card-surface overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)]">
      <Link to="/report/$id" params={{ id: report.id }} className="block">
        <img
          src={report.photo_url}
          alt={report.category}
          className="h-44 w-full object-cover"
          loading="lazy"
        />
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={report.category} />
            <StatusBadge status={report.status} />
          </div>
          <p className="line-clamp-2 min-h-10 text-sm text-foreground">
            {report.description || "No description provided."}
          </p>
          <p className="text-xs text-muted-foreground">
            {relativeTime(report.created_at)}
          </p>
        </div>
      </Link>
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-xs text-muted-foreground">
          {report.address ??
            `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
        </span>
        <button
          type="button"
          onClick={onUpvote}
          className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-sm font-semibold transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <ArrowBigUp className="size-4" />
          {report.upvotes}
        </button>
      </div>
    </div>
  );
}
