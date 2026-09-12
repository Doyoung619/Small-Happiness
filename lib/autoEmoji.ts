/** Keyword → emoji mapping for auto-detection */

interface EmojiRule {
  keywords: string[];
  emoji: string;
  label: string;
}

const RULES: EmojiRule[] = [
  { keywords: ["flower", "blossom", "bloom", "rose", "tulip", "spring", "cherry", "petal"], emoji: "🌸", label: "Blossom" },
  { keywords: ["coffee", "cafe", "latte", "americano", "espresso", "mocha"], emoji: "☕", label: "Coffee" },
  { keywords: ["dog", "puppy", "woof", "canine", "bark", "pup", "shiba", "golden"], emoji: "🐕", label: "Dogs" },
  { keywords: ["cat", "kitten", "kitty", "feline", "purr"], emoji: "🐱", label: "Cats" },
  { keywords: ["music", "jazz", "song", "guitar", "piano", "playlist", "concert"], emoji: "🎵", label: "Music" },
  { keywords: ["art", "mural", "painting", "drawing", "gallery", "creative", "street-art"], emoji: "🎨", label: "Art" },
  { keywords: ["sunset", "dusk", "sky", "evening glow", "golden hour"], emoji: "🌅", label: "Sunset" },
  { keywords: ["book", "library", "reading", "novel", "essay", "literature"], emoji: "📚", label: "Reading" },
  { keywords: ["boba", "bubble", "milk tea", "tapioca", "bubble tea", "sweet drink"], emoji: "🧋", label: "Boba" },
  { keywords: ["fountain", "water feature", "sprinkler"], emoji: "⛲", label: "Fountain" },
  { keywords: ["park", "walk", "nature", "tree", "forest", "green", "garden"], emoji: "🌿", label: "Nature" },
  { keywords: ["happy", "joy", "smile", "glad", "cheer"], emoji: "😊", label: "Happy" },
  { keywords: ["night", "moon", "star", "late", "dark"], emoji: "🌙", label: "Night" },
  { keywords: ["food", "eat", "meal", "yummy", "restaurant", "snack", "dessert"], emoji: "🍜", label: "Food" },
  { keywords: ["warm", "cozy", "comfort", "soft", "snug"], emoji: "🫶", label: "Cozy" },
  { keywords: ["cute", "adorable", "sweet", "lovely", "charming"], emoji: "💜", label: "Cute" },
  { keywords: ["people", "friend", "friendship", "together", "group", "togetherness"], emoji: "👯", label: "Friends" },
  { keywords: ["rain", "umbrella", "wet", "drizzle", "storm"], emoji: "🌧️", label: "Rain" },
  { keywords: ["snow", "winter", "frost", "ice"], emoji: "❄️", label: "Snow" },
  { keywords: ["stairs", "alley", "narrow", "lane", "walkway"], emoji: "🪜", label: "Alley" },
  { keywords: ["wind", "breeze", "cool", "fresh", "air"], emoji: "🍃", label: "Breeze" },
];

export interface SuggestedEmoji {
  emoji: string;
  label: string;
}

/**
 * Scan text and return up to 3 suggested emojis based on keywords.
 */
export function detectEmojis(text: string): SuggestedEmoji[] {
  if (!text.trim()) return [];
  const lower = text.toLowerCase();
  const matched: SuggestedEmoji[] = [];

  for (const rule of RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      matched.push({ emoji: rule.emoji, label: rule.label });
      if (matched.length >= 3) break;
    }
  }

  return matched;
}
