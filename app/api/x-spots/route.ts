import { JoyCategory } from "@/lib/mockPins";

export const dynamic = "force-dynamic";

const XAI_RESPONSES_URL = "https://api.x.ai/v1/responses";
const CACHE_NAME = "joywalk-grok-spots-v1";
const CACHE_KEY = "https://joywalk.internal/api/x-spots/v1";
const CACHE_SECONDS = 6 * 60 * 60;
const ALLOWED_CATEGORIES = new Set<JoyCategory>([
  "dog", "nature", "cafe", "music", "art", "view", "food", "other",
]);

type XSpot = {
  title: string;
  description: string;
  emoji: string;
  lat: number;
  lng: number;
  location: string;
  sourceUrl: string;
  sourceHandle: string;
  category: JoyCategory;
  tags: string[];
};

type GrokResponse = {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

function json(data: unknown, status = 200, cache = true) {
  return Response.json(data, {
    status,
    headers: cache
      ? { "Cache-Control": `public, max-age=300, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400` }
      : { "Cache-Control": "no-store" },
  });
}

function isPittsburghCoordinate(lat: number, lng: number) {
  return lat >= 40.35 && lat <= 40.55 && lng >= -80.12 && lng <= -79.82;
}

function normalizeXUrl(value: string) {
  try {
    const url = new URL(value.replace("https://twitter.com/", "https://x.com/"));
    if (url.protocol !== "https:" || url.hostname !== "x.com") return null;
    if (!/^\/[A-Za-z0-9_]+\/status\/\d+/.test(url.pathname)) return null;
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

function cleanSpot(raw: Partial<XSpot>, index: number): XSpot & { id: string; imageUrl: string; sharedAt: string; sourceType: "grok-x"; sourceLabel: string } | null {
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  const sourceUrl = normalizeXUrl(String(raw.sourceUrl || ""));
  const title = String(raw.title || "").trim().slice(0, 72);
  const description = String(raw.description || "").trim().slice(0, 220);
  if (!title || !description || !sourceUrl || !isPittsburghCoordinate(lat, lng)) return null;

  const category = ALLOWED_CATEGORIES.has(raw.category as JoyCategory)
    ? (raw.category as JoyCategory)
    : "other";
  const sourceHandle = String(raw.sourceHandle || "community").replace(/^@/, "").slice(0, 30);
  return {
    id: `grok-x-${index}-${sourceUrl.split("/").pop()}`,
    title,
    description,
    emoji: String(raw.emoji || "✨").slice(0, 8),
    lat,
    lng,
    location: String(raw.location || "Pittsburgh").slice(0, 80),
    sourceUrl,
    sourceHandle,
    category,
    tags: Array.isArray(raw.tags)
      ? raw.tags.map(String).map((tag) => tag.trim().slice(0, 24)).filter(Boolean).slice(0, 3)
      : ["Pittsburgh"],
    imageUrl: `https://picsum.photos/seed/${encodeURIComponent(sourceUrl)}/900/700`,
    sharedAt: "found on X",
    sourceType: "grok-x",
    sourceLabel: "Discovered by Grok on X",
  };
}

function outputText(response: GrokResponse) {
  const message = response.output?.find((item) => item.type === "message");
  return message?.content?.find((item) => item.type === "output_text")?.text;
}

async function discoverSpots(apiKey: string) {
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - 45 * 24 * 60 * 60 * 1000);
  const response = await fetch(XAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-4.6",
      store: false,
      reasoning: { effort: "low" },
      max_turns: 2,
      input: [
        {
          role: "user",
          content: [
            "Use X Search now. Find 2 or 3 recent public posts about small, positive, visitable moments in Pittsburgh, especially Oakland, CMU, Pitt, Shadyside, Squirrel Hill, Downtown, the Strip, or the North Shore.",
            "Return only places a visitor can safely reach in public. Exclude private homes, emergencies, politics, ads, vague city-wide commentary, and events that have already ended.",
            "Each result must cite the exact X status URL you actually used. Paraphrase instead of copying post text. Coordinates may be a careful landmark-level approximation, but must be within Pittsburgh.",
          ].join(" "),
        },
      ],
      tools: [{
        type: "x_search",
        from_date: fromDate.toISOString().slice(0, 10),
        to_date: toDate.toISOString().slice(0, 10),
      }],
      text: {
        format: {
          type: "json_schema",
          name: "joywalk_x_spots",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["spots"],
            properties: {
              spots: {
                type: "array",
                minItems: 2,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title", "description", "emoji", "lat", "lng", "location", "sourceUrl", "sourceHandle", "category", "tags"],
                  properties: {
                    title: { type: "string", maxLength: 72 },
                    description: { type: "string", maxLength: 220 },
                    emoji: { type: "string", maxLength: 8 },
                    lat: { type: "number", minimum: 40.35, maximum: 40.55 },
                    lng: { type: "number", minimum: -80.12, maximum: -79.82 },
                    location: { type: "string", maxLength: 80 },
                    sourceUrl: { type: "string", format: "uri" },
                    sourceHandle: { type: "string", maxLength: 30 },
                    category: { type: "string", enum: ["dog", "nature", "cafe", "music", "art", "view", "food", "other"] },
                    tags: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", maxLength: 24 } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    signal: AbortSignal.timeout(55_000),
  });

  if (!response.ok) throw new Error(`xAI request failed (${response.status})`);
  const body = await response.json() as GrokResponse;
  // The Responses REST API currently serializes hosted X Search as
  // `custom_tool_call`; older SDK-shaped responses use `x_search_call`.
  if (!body.output?.some((item) => item.type === "x_search_call" || item.type === "custom_tool_call")) {
    throw new Error("Grok did not use X Search");
  }
  const text = outputText(body);
  if (!text) throw new Error("Grok returned no structured output");
  const parsed = JSON.parse(text) as { spots?: Partial<XSpot>[] };
  const spots = (parsed.spots || []).map(cleanSpot).filter((spot): spot is NonNullable<typeof spot> => Boolean(spot));
  if (spots.length < 2) throw new Error("Grok returned too few verifiable Pittsburgh spots");
  return { spots, generatedAt: new Date().toISOString(), provider: "grok-x-search" };
}

async function readEdgeCache() {
  if (!("caches" in globalThis)) return null;
  const cache = await globalThis.caches.open(CACHE_NAME);
  return cache.match(CACHE_KEY);
}

async function writeEdgeCache(response: Response) {
  if (!("caches" in globalThis)) return;
  const cache = await globalThis.caches.open(CACHE_NAME);
  await cache.put(CACHE_KEY, response);
}

export async function GET() {
  const cached = await readEdgeCache();
  if (cached) return cached;

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return json({ spots: [], provider: "fallback", error: "X Search is temporarily unavailable." }, 200, false);

  try {
    const payload = await discoverSpots(apiKey);
    const response = json(payload);
    await writeEdgeCache(response.clone());
    return response;
  } catch (error) {
    console.error("Grok X Search refresh failed:", error instanceof Error ? error.message : "Unknown error");
    // Keep the public demo stable even if the API is out of quota or X has no safe matches.
    return json({ spots: [], provider: "fallback", error: "Using community spots while Grok refreshes." }, 200, false);
  }
}
