import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, ClipboardCheck, Hammer, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "How FixTrack Works — Transparent Repair Tracking" },
      {
        name: "description",
        content:
          "FixTrack turns pothole complaints into a public, four-stage trail: Reported, Assigned, Repaired, Verified. Here's how it works.",
      },
      { property: "og:title", content: "How FixTrack Works" },
      {
        property: "og:description",
        content:
          "A public four-stage trail for every civic complaint: Reported, Assigned, Repaired, Verified.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const steps = [
  {
    icon: Camera,
    title: "1. Reported",
    body: "You snap a photo of the pothole or issue and drop a pin on the map. That's your complaint, timestamped and public.",
  },
  {
    icon: ClipboardCheck,
    title: "2. Assigned",
    body: "The complaint is handed to a contractor or ward team. The status changes so you know someone owns it.",
  },
  {
    icon: Hammer,
    title: "3. Repaired",
    body: "The contractor uploads an 'after' photo of the finished work — proof, not a checkbox.",
  },
  {
    icon: ShieldCheck,
    title: "4. Verified",
    body: "The before and after photos are compared and the repair is confirmed. Only then is the complaint closed.",
  },
];

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Complaints shouldn't vanish into a black box
      </h1>
      <p className="mt-4 text-muted-foreground">
        Most civic complaints end the moment you press send. You never learn who picked
        it up, whether anything was done, or if the repair actually holds. FixTrack keeps
        every complaint visible from the first photo to the verified fix — for the person
        who reported it and for everyone else in the neighbourhood.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {steps.map((s) => (
          <div key={s.title} className="card-surface p-5">
            <s.icon className="size-6 text-primary" />
            <h2 className="mt-3 text-lg font-semibold">{s.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="card-surface mt-8 p-5">
        <h2 className="text-lg font-semibold">Why it matters</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Because the whole trail is public, anyone can see how many issues are open in
          their area, how long repairs take, and which ones were genuinely verified.
          Upvotes let a neighbourhood push the worst potholes to the top of the list.
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-secondary p-5 text-sm">
        <p className="font-semibold">About this build</p>
        <p className="mt-1 text-muted-foreground">
          FixTrack is a hackathon MVP built for <strong>MUSA CodeX 2026</strong> by{" "}
          <strong>Team B3TTERBYTES</strong>, for problem statement{" "}
          <strong>CX0401</strong>. Verification is currently manual; automated
          before/after photo comparison is the next step.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Report an issue
        </Link>
        <Link
          to="/dashboard"
          className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-secondary"
        >
          Browse the dashboard
        </Link>
      </div>
    </div>
  );
}
