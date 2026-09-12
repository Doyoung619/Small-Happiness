/** Keyword → emoji mapping for auto-detection */

interface EmojiRule {
  keywords: string[];
  emoji: string;
  label: string;
}

const RULES: EmojiRule[] = [
  { keywords: ["꽃", "벚꽃", "flower", "blossom", "bloom", "봄", "장미", "튤립"], emoji: "🌸", label: "꽃" },
  { keywords: ["커피", "coffee", "카페", "cafe", "라떼", "latte", "아메리카노", "에스프레소"], emoji: "☕", label: "카페" },
  { keywords: ["강아지", "개", "dog", "puppy", "멍멍", "mochi", "골든", "댕댕"], emoji: "🐕", label: "강아지" },
  { keywords: ["고양이", "냥", "cat", "kitten", "야옹"], emoji: "🐱", label: "고양이" },
  { keywords: ["음악", "music", "재즈", "jazz", "노래", "song", "기타", "피아노"], emoji: "🎵", label: "음악" },
  { keywords: ["예술", "art", "그림", "벽화", "mural", "미술", "갤러리", "gallery"], emoji: "🎨", label: "예술" },
  { keywords: ["석양", "노을", "sunset", "일몰", "황혼", "하늘", "sky"], emoji: "🌅", label: "석양" },
  { keywords: ["책", "book", "도서관", "library", "독서", "소설"], emoji: "📚", label: "독서" },
  { keywords: ["버블티", "boba", "밀크티", "bubble", "타피오카", "음료"], emoji: "🧋", label: "버블티" },
  { keywords: ["분수", "fountain"], emoji: "⛲", label: "분수" },
  { keywords: ["공원", "park", "산책", "자연", "나무", "tree", "숲", "forest"], emoji: "🌿", label: "자연" },
  { keywords: ["행복", "happy", "기쁨", "joy", "웃음", "smile", "좋아", "좋은", "설레"], emoji: "😊", label: "행복" },
  { keywords: ["야경", "밤", "night", "별", "star", "달", "moon"], emoji: "🌙", label: "밤" },
  { keywords: ["음식", "먹", "food", "eat", "맛있", "yummy", "맛집", "식당"], emoji: "🍜", label: "음식" },
  { keywords: ["따뜻", "warm", "포근", "cozy", "아늑"], emoji: "🫶", label: "따뜻함" },
  { keywords: ["귀여", "cute", "예쁜", "이쁜", "adorable"], emoji: "💜", label: "귀여움" },
  { keywords: ["사람", "people", "친구", "friend", "같이", "함께", "우리"], emoji: "👯", label: "함께" },
  { keywords: ["비", "rain", "우산", "rainy"], emoji: "🌧️", label: "비" },
  { keywords: ["눈", "snow", "겨울", "winter"], emoji: "❄️", label: "눈" },
  { keywords: ["계단", "stairs", "골목", "alley"], emoji: "🪜", label: "골목" },
  { keywords: ["바람", "wind", "시원", "cool", "상쾌"], emoji: "🍃", label: "바람" },
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
