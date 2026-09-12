import { JoyCategory, Pin } from "./mockPins";

export const CF_WEIGHT = 0.6;
export const CONTENT_WEIGHT = 0.4;

export type JoySpot = Pin & {
  category: JoyCategory;
  tags: string[];
};

export type UserInteraction = {
  userId: string;
  spotId: string;
  visited?: boolean;
  liked?: boolean;
  saved?: boolean;
  skipped?: boolean;
};

const CATEGORY_META: Record<JoyCategory, { label: string; tags: string[] }> = {
  dog: { label: "Dogs", tags: ["animals", "friendly", "playful"] },
  nature: { label: "Nature", tags: ["park", "flowers", "green"] },
  cafe: { label: "Cafes", tags: ["coffee", "cozy", "drinks"] },
  music: { label: "Music", tags: ["live", "jazz", "sound"] },
  art: { label: "Art", tags: ["mural", "creative", "street-art"] },
  view: { label: "Scenic views", tags: ["sunset", "skyline", "scenic"] },
  food: { label: "Food", tags: ["bakery", "snack", "local"] },
  other: { label: "Hidden gems", tags: ["community", "surprise", "local"] },
};

function inferCategory(pin: Pin): JoyCategory {
  const value = `${pin.emoji} ${pin.title} ${pin.description}`.toLowerCase();
  if (/🐕|🐶|dog|puppy/.test(value)) return "dog";
  if (/☕|🧋|coffee|cafe|tea/.test(value)) return "cafe";
  if (/🎷|🎵|🎶|music|jazz|piano/.test(value)) return "music";
  if (/🎨|🖼|mural|mosaic|art/.test(value)) return "art";
  if (/🌅|🌇|sunset|skyline|view/.test(value)) return "view";
  if (/🥐|🍕|food|bakery|snack/.test(value)) return "food";
  if (/🌸|🌿|🌳|⛲|garden|park|flower|tree/.test(value)) return "nature";
  return "other";
}

export function toJoySpot(pin: Pin): JoySpot {
  const category = pin.category ?? inferCategory(pin);
  return { ...pin, category, tags: pin.tags?.length ? pin.tags : CATEGORY_META[category].tags };
}

function preference(interaction: UserInteraction) {
  return Number(interaction.visited) + 3 * Number(interaction.liked) + 2 * Number(interaction.saved) - Number(interaction.skipped);
}

function cosine(left: Map<string, number>, right: Map<string, number>) {
  const keys = new Set([...left.keys(), ...right.keys()]);
  let dot = 0;
  let leftLength = 0;
  let rightLength = 0;
  keys.forEach((key) => {
    const a = left.get(key) ?? 0;
    const b = right.get(key) ?? 0;
    dot += a * b;
    leftLength += a * a;
    rightLength += b * b;
  });
  return leftLength && rightLength ? dot / Math.sqrt(leftLength * rightLength) : 0;
}

function interactionVector(userId: string, interactions: UserInteraction[]) {
  return new Map(interactions.filter((item) => item.userId === userId).map((item) => [item.spotId, preference(item)]));
}

export function collaborativeScore(userId: string, spotId: string, interactions: UserInteraction[]) {
  const current = interactionVector(userId, interactions);
  const users = [...new Set(interactions.map((item) => item.userId))].filter((id) => id !== userId);
  let weighted = 0;
  let similarities = 0;
  users.forEach((otherId) => {
    const similarity = Math.max(0, cosine(current, interactionVector(otherId, interactions)));
    const score = preference(interactions.find((item) => item.userId === otherId && item.spotId === spotId) ?? { userId: otherId, spotId });
    weighted += similarity * Math.max(0, score) / 6;
    similarities += similarity;
  });
  return similarities ? weighted / similarities : 0;
}

function features(spot: JoySpot) {
  const vector = new Map<string, number>([[`category:${spot.category}`, 2]]);
  spot.tags.forEach((tag) => vector.set(`tag:${tag.toLowerCase()}`, 1));
  if (spot.song) {
    vector.set(`song:${spot.song.title.toLowerCase()}`, 1);
    vector.set(`artist:${spot.song.artist.toLowerCase()}`, 1);
  }
  return vector;
}

function preferenceProfile(userId: string, spots: JoySpot[], interactions: UserInteraction[]) {
  const byId = new Map(spots.map((spot) => [spot.id, spot]));
  const profile = new Map<string, number>();
  interactions.filter((item) => item.userId === userId && preference(item) > 0).forEach((item) => {
    const spot = byId.get(item.spotId);
    if (!spot) return;
    features(spot).forEach((value, key) => profile.set(key, Math.max(profile.get(key) ?? 0, value * preference(item))));
  });
  return profile;
}

export function contentScore(userId: string, spot: JoySpot, spots: JoySpot[], interactions: UserInteraction[]) {
  return Math.max(0, cosine(preferenceProfile(userId, spots, interactions), features(spot)));
}

export function rankJoySpots(userId: string, candidates: Pin[], interactions: UserInteraction[]) {
  const spots = candidates.map(toJoySpot);
  return spots.map((spot) => {
    const collaborative = collaborativeScore(userId, spot.id, interactions);
    const content = contentScore(userId, spot, spots, interactions);
    const score = CF_WEIGHT * collaborative + CONTENT_WEIGHT * content;
    return {
      ...spot,
      recommendation: {
        match: Math.round(score * 100),
        reasons: [CATEGORY_META[spot.category].label, ...spot.tags.slice(0, 1)],
        similarUsersLiked: collaborative > 0.45,
      },
      score,
    };
  }).sort((a, b) => b.score - a.score);
}
