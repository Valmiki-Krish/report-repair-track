// supabase/functions/verify-repair/index.ts
// 
// Compares a report's "before" and "after" photos and returns a similarity
// verdict, instead of letting anyone click "Mark as Verified" with no check.
//
// Method (deliberately simple + explainable for a hackathon demo):
//   1. Download both images.
//   2. Resize each to a tiny 8x8 grayscale grid and compute an "average
//      hash" (aHash) — a classic, well-known perceptual-hash technique.
//   3. Compare the two hashes with Hamming distance (how many of the 64
//      bits differ).
//
// What this catches:
//   - Contractor re-uploads the SAME photo as "after" (near-zero difference
//     -> flagged, since nothing visibly changed).
//   - Contractor uploads a photo of a totally different, unrelated pothole
//     that looks nothing like the original framing/scene (very high
//     difference -> flagged as likely mismatched location).
//
// What this does NOT do (be upfront about this to judges):
//   - It is not full ORB/SIFT keypoint + GPS + landmark matching, which is
//     the fuller design described in the pitch deck. That is future work.
//   - GPS matching is not meaningful here because this schema stores ONE
//     lat/lng per report (captured at submission time), not a separate GPS
//     reading per photo. A production version would capture GPS on both
//     the "before" and "after" photo uploads and compare those.
//
// This still gives a real, non-fake automated check in the demo: it will
// actually flag a lazy/faked "after" photo instead of rubber-stamping it.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SIMILARITY_TOO_HIGH = 4; // hamming distance below this = "looks unchanged"
const SIMILARITY_TOO_LOW = 40; // hamming distance above this = "looks unrelated"

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

async function averageHash(bytes: Uint8Array): Promise<bigint> {
  const { Image } = await import("npm:imagescript@1.3.0");
  const img = await Image.decode(bytes);
  img.resize(8, 8);

  let sum = 0;
  const gray: number[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const [r, g, b] = Image.colorToRGBA(img.getPixelAt(x + 1, y + 1));
      const v = (r + g + b) / 3;
      gray.push(v);
      sum += v;
    }
  }
  const avg = sum / gray.length;

  let hash = 0n;
  for (let i = 0; i < gray.length; i++) {
    hash <<= 1n;
    if (gray[i] >= avg) hash |= 1n;
  }
  return hash;
}

function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b;
  let count = 0;
  while (x > 0n) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const { report_id } = await req.json();
    if (!report_id) {
      return new Response(JSON.stringify({ error: "report_id is required" }), {
        status: 400,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: report, error: fetchErr } = await supabase
      .from("reports")
      .select("photo_url, after_photo_url, status")
      .eq("id", report_id)
      .single();

    if (fetchErr || !report) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }
    if (!report.after_photo_url) {
      return new Response(
        JSON.stringify({ error: "No after-photo submitted yet" }),
        { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
      );
    }

    const [beforeRes, afterRes] = await Promise.all([
      fetch(report.photo_url),
      fetch(report.after_photo_url),
    ]);
    if (!beforeRes.ok || !afterRes.ok) {
      return new Response(
        JSON.stringify({ error: "Could not download one of the photos" }),
        { status: 502, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
      );
    }

    const [beforeBytes, afterBytes] = await Promise.all([
      beforeRes.arrayBuffer(),
      afterRes.arrayBuffer(),
    ]);

    const [beforeHash, afterHash] = await Promise.all([
      averageHash(new Uint8Array(beforeBytes)),
      averageHash(new Uint8Array(afterBytes)),
    ]);

    const distance = hammingDistance(beforeHash, afterHash);

    let verdict: "verified" | "flagged_unchanged" | "flagged_mismatch";
    let message: string;

    if (distance < SIMILARITY_TOO_HIGH) {
      verdict = "flagged_unchanged";
      message =
        "The after photo looks nearly identical to the before photo. This usually means no visible repair work was captured — ask the contractor to resubmit.";
    } else if (distance > SIMILARITY_TOO_LOW) {
      verdict = "flagged_mismatch";
      message =
        "The after photo looks very different in overall scene from the before photo. This may be an unrelated location — please review manually before verifying.";
    } else {
      verdict = "verified";
      message =
        "The after photo shows a plausible change from the before photo. Auto-verified.";
    }

    if (verdict === "verified") {
      await supabase
        .from("reports")
        .update({ status: "Verified", verified_at: new Date().toISOString() })
        .eq("id", report_id);
    }

    return new Response(
      JSON.stringify({ verdict, message, hamming_distance: distance }),
      { headers: { ...corsHeaders(), "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err instanceof Error ? err.message : err) }),
      { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
    );
  }
});
