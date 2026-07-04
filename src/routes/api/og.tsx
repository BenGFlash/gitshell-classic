import { createFileRoute } from "@tanstack/react-router";
import { ImageResponse } from "@vercel/og";

// Dynamic OpenGraph card. EDIT ONLY the constants below (SITE_NAME, SITE_TAGLINE, OG_BG/OG_TEXT/OG_MUTED)
// to match the site — do NOT change the JSX, font sizes, alignment, or centering below; they are tuned for
// a consistent, centered card. While SITE_NAME is still the default, or if the image fails to render, we
// serve the bundled Poke image at /og.jpg directly (HTTP 200, not a redirect) so the live link preview is
// never empty — even on crawlers (iMessage, WhatsApp) that don't follow redirects for og:image.
const SITE_NAME = "GitShell";
const SITE_TAGLINE = "Cyberpunk Terminal for GitHub Management";

// The building agent sets these to match the site's actual page design.
const OG_BG = "#0a0a0a"; // card background color
const OG_TEXT = "#00ff41"; // title color (neon green)
const OG_MUTED = "#00f0ff"; // tagline color (neon cyan)

// milesdobrenski 06/18/2026: generated sites are edited and redeployed often, so never cache the OG
// image at the CDN — always regenerate it so link previews reflect the site's current state.
const OG_CACHE_CONTROL = "no-cache, no-store, must-revalidate";

let fontsPromise: Promise<[ArrayBuffer, ArrayBuffer]> | null = null;
let fallbackBytesPromise: Promise<ArrayBuffer> | null = null;

async function fetchAsset(url: URL, timeoutMs = 5000): Promise<ArrayBuffer> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`${url.pathname} ${res.status}`);
      const buf = await res.arrayBuffer();
      if (buf.byteLength === 0) throw new Error(`${url.pathname} empty`);
      return buf;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function loadFonts(baseUrl: string): Promise<[ArrayBuffer, ArrayBuffer]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      fetchAsset(new URL("/fonts/Exposure-static.ttf", baseUrl)),
      fetchAsset(new URL("/fonts/OpenRunde-Medium.ttf", baseUrl)),
    ]).catch((error) => {
      fontsPromise = null;
      throw error;
    });
  }
  return fontsPromise;
}

function loadFallbackBytes(baseUrl: string): Promise<ArrayBuffer> {
  if (!fallbackBytesPromise) {
    fallbackBytesPromise = fetchAsset(new URL("/og.jpg", baseUrl)).catch(
      (error) => {
        fallbackBytesPromise = null;
        throw error;
      },
    );
  }
  return fallbackBytesPromise;
}

async function serveFallback(baseUrl: string): Promise<Response> {
  try {
    const bytes = await loadFallbackBytes(baseUrl);
    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": "image/jpeg",
        "cache-control": OG_CACHE_CONTROL,
      },
    });
  } catch {
    return Response.redirect(new URL("/og.jpg", baseUrl).toString(), 302);
  }
}

export const Route = createFileRoute("/api/og")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (SITE_NAME === "Poke Site" || !SITE_NAME.trim()) {
          return serveFallback(request.url);
        }

        try {
          const [exposure, openRunde] = await loadFonts(request.url);

          const title =
            SITE_NAME.length > 50 ? `${SITE_NAME.slice(0, 47)}…` : SITE_NAME;

          // milesdobrenski 06/18/2026: override @vercel/og's default immutable 1y cache-control so
          // edited-and-redeployed sites never serve a stale preview (see OG_CACHE_CONTROL).
          return new ImageResponse(
            <div
              style={{
                height: "100%",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: OG_BG,
                paddingTop: "128px",
                paddingRight: "96px",
                paddingBottom: "64px",
                paddingLeft: "96px",
              }}
            >
              <div
                style={{
                  fontFamily: "Exposure",
                  fontSize: SITE_NAME.length > 30 ? 64 : 84,
                  fontWeight: 400,
                  color: OG_TEXT,
                  lineHeight: 1.15,
                  textAlign: "center",
                  maxWidth: 900,
                }}
              >
                {title}
              </div>
              {SITE_TAGLINE ? (
                <div
                  style={{
                    fontFamily: "OpenRunde",
                    fontSize: 36,
                    color: OG_MUTED,
                    lineHeight: 1.3,
                    textAlign: "center",
                    marginTop: 24,
                    maxWidth: 820,
                  }}
                >
                  {SITE_TAGLINE}
                </div>
              ) : null}
            </div>,
            {
              width: 1200,
              height: 630,
              fonts: [
                {
                  name: "Exposure",
                  data: exposure,
                  style: "normal",
                  weight: 500,
                },
                {
                  name: "OpenRunde",
                  data: openRunde,
                  style: "normal",
                  weight: 500,
                },
              ],
              headers: {
                "cache-control": OG_CACHE_CONTROL,
              },
            },
          );
        } catch {
          return serveFallback(request.url);
        }
      },
    },
  },
});
