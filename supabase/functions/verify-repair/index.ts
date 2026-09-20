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

type Decoded = { width: number; height: number; data: Uint8Array }; // RGBA

/**
 * Pure-JS decoding (no native/wasm addons — the edge runtime has no arch
 * support for those). Handles the JPEG/PNG uploads the app accepts.
 */
async function decode(bytes: Uint8Array): Promise<Decoded> {
  const isPng =
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;

  if (isPng) {
    const { decode: decodePng } = await import("npm:fast-png@6.2.0");
    const png = decodePng(bytes);
    const channels = png.channels ?? 4;
    const src = png.data as unknown as ArrayLike<number>;
    const out = new Uint8Array(png.width * png.height * 4);
    for (let i = 0; i < png.width * png.height; i++) {
      const s = i * channels;
      if (channels >= 3) {
        out[i * 4] = src[s];
        out[i * 4 + 1] = src[s + 1];
        out[i * 4 + 2] = src[s + 2];
      } else {
        out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = src[s];
      }
      out[i * 4 + 3] = 255;
    }
    return { width: png.width, height: png.height, data: out };
  }

  const jpeg = await import("npm:jpeg-js@0.4.4");
  const img = jpeg.default.decode(bytes, { useTArray: true });
  return { width: img.width, height: img.height, data: new Uint8Array(img.data) };
}

/** Box-downsample to 8x8 grayscale, then average-hash. */
async function averageHash(bytes: Uint8Array): Promise<bigint> {
  const img = await decode(bytes);

  let sum = 0;
  const gray: number[] = [];
  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      const x0 = Math.floor((gx * img.width) / 8);
      const x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * img.width) / 8));
      const y0 = Math.floor((gy * img.height) / 8);
      const y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * img.height) / 8));

      let acc = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * img.width + x) * 4;
          acc += (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3;
          n++;
        }
      }
      const v = acc / n;
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
