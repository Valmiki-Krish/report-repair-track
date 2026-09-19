# FixTrack: Your Civic Report

Build a complete civic issue reporting web app called FixTrack — a hackathon MVP for a "transparent pothole complaint-to-repair tracking platform."

CONCEPT:

Citizens report potholes with a photo and location. A contractor later submits an "after" repair photo. Each complaint moves through a status lifecycle: Reported → Assigned → Repaired → Verified. The core value proposition is transparency — citizens can track their complaint from submission to verified resolution, instead of it disappearing into a black box.

===================

DATABASE (use Supabase)

===================

Create a "reports" table with these fields:

- id (uuid, primary key)

- photo_url (text) — the "before" photo

- after_photo_url (text, nullable) — the "after" repair photo

- description (text)

- category (text) — one of: Pothole, Streetlight, Garbage, Flooding, Other

- latitude (float)

- longitude (float)

- address (text, nullable) — reverse-geocoded or manually entered

- status (text) — one of: Reported, Assigned, Repaired, Verified

- reporter_name (text, nullable)

- upvotes (integer, default 0)

- created_at (timestamp, default now)

- updated_at (timestamp, default now)

Set up Supabase Storage for photo uploads (both before and after photos), with public read access so images display on the dashboard.

===================

PAGE 1 — Report Submission Page (default landing page)

===================

- Clean form with:

  - Photo upload (drag-and-drop or tap-to-upload, required, with image preview after selecting)

  - "Use my current location" button that requests browser geolocation and auto-fills lat/lng, with a fallback interactive map (Leaflet + OpenStreetMap tiles) where the user can manually drop/drag a pin if geolocation fails or they want to adjust it

  - Description textarea (placeholder: "Describe the issue...")

  - Category dropdown (Pothole, Streetlight, Garbage, Flooding, Other) — default to Pothole

  - Optional name field ("Your name (optional)")

  - Submit button that saves the report with status "Reported" and shows a success confirmation with a "View on Dashboard" link

- Validate that a photo and location are present before allowing submission

- Show a friendly loading state while the photo uploads

===================

PAGE 2 — Public Dashboard

===================

- Two view toggle: "Map View" and "List View"

- Map View: Leaflet map showing a pin for every report, color-coded by status (gray=Reported, yellow=Assigned, blue=Repaired, green=Verified). Clicking a pin shows a popup with a thumbnail, category, status, and a "View Details" link

- List View: grid of cards, each showing the photo thumbnail, category badge, status badge (color-coded as above), short description preview, relative time ("2 days ago"), and upvote count with an upvote button

- Filter bar at top: filter by status (All / Reported / Assigned / Repaired / Verified) and by category

- Sort options: Newest first, Most upvoted

- Click any card/pin to go to the Report Detail Page

===================

PAGE 3 — Report Detail Page

===================

- Full-size before photo, description, category, address/coordinates, submission date, upvote count

- Status timeline component showing the 4 stages (Reported → Assigned → Repaired → Verified) with the current stage highlighted

- Admin-style controls (no real auth needed for this MVP — just show these controls to everyone, labeled clearly as "Demo Admin Controls"):

  - If status is "Reported": button "Mark as Assigned to Contractor"

  - If status is "Assigned": an upload field appears for the "after" photo, with a button "Submit Repair Photo & Mark Repaired" — this uploads the after-photo and sets status to "Repaired"

  - If status is "Repaired": show the before and after photos side by side, plus a placeholder verification panel that says "Verification: Pending CV Check" with a manual "Mark as Verified" button for now (this will later be replaced by an automated OpenCV comparison — leave a clear comment in the code marking this as `// TODO: replace with automated CV verification call`)

  - If status is "Verified": show both photos side by side with a green "Verified ✓" badge and the timestamp it was verified

===================

PAGE 4 — About / How It Works (simple static page)

===================

- Short explanation of the FixTrack concept and the 4-stage process, written for a citizen audience

- Mention this is a hackathon MVP for MUSA CodeX 2026, Team B3TTERBYTES, problem statement CX0401

===================

NAVIGATION

===================

- Top navbar with: FixTrack logo/name, "Report an Issue", "Dashboard", "About" — sticky on scroll

- Mobile-friendly hamburger menu on small screens

===================

DESIGN SYSTEM

===================

- Modern civic-tech aesthetic: primary color a trustworthy blue (#2563EB or similar), accent teal/green for "verified" states, clean white/light-gray backgrounds, rounded cards with subtle shadows

- Use a clean sans-serif font (Inter or similar)

- Fully responsive/mobile-first, since most citizen reporting will happen on phones

- Status badges consistently color-coded across every page: gray (Reported), yellow/amber (Assigned), blue (Repaired), green (Verified)

- Empty states (e.g. "No reports yet — be the first to report an issue!") where relevant

===================

BUILD ORDER

===================

Build all of this in one pass if possible: database schema first, then Report Submission Page, then Dashboard (both views), then Report Detail Page with the status workflow, then the About page and navigation last.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9a318f59-a527-42ac-af88-b66749b47cb9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
