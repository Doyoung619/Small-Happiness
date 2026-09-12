export interface Pin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  emoji: string;
  imageUrl: string;   // picsum placeholder — replace with real photo later
  author: string;
  sharedAt: string;   // e.g. "2h ago"
  label?: string;
  hue?: number;
  category?: JoyCategory;
  tags?: string[];
  tagLabels?: Record<string, string>;
  song?: { id: string; title: string; artist: string; album: string; artworkUrl: string; url: string };
  likeCount?: number;
  visitCount?: number;
  recommendation?: {
    match: number;
    reasons: string[];
    similarUsersLiked: boolean;
  };
}

export type JoyCategory = "dog" | "nature" | "cafe" | "music" | "art" | "view" | "food" | "other";

// Mock pins seeded around CMU / Oakland / Shadyside area, Pittsburgh
// imageUrl uses picsum.photos/seed/{id}/600/400 for consistent placeholder per pin
export const MOCK_PINS: Pin[] = [
  {
    id: "pin-1",
    lat: 40.4433,
    lng: -79.9436,
    title: "Schenley Park Cherry Blossoms",
    description: "A hidden cluster of cherry blossom trees that blooms every spring. Blink and you'll miss it.",
    emoji: "🌸",
    imageUrl: "https://picsum.photos/seed/pin1/600/400",
    author: "sarah_walks",
    sharedAt: "2h ago",
  },
  {
    id: "pin-2",
    lat: 40.4475,
    lng: -79.9508,
    title: "The Tiny Free Library",
    description: "A little wooden box filled with donated books. Take one, leave one. It's been there since 2019.",
    emoji: "📚",
    imageUrl: "https://picsum.photos/seed/pin2/600/400",
    author: "bookworm_pgh",
    sharedAt: "5h ago",
  },
  {
    id: "pin-3",
    lat: 40.4502,
    lng: -79.9365,
    title: "Mosaic Staircase",
    description: "A staircase decorated entirely in hand-laid mosaic tiles by local art students. Every tile tells a story.",
    emoji: "🎨",
    imageUrl: "https://picsum.photos/seed/pin3/600/400",
    author: "artlover_pgh",
    sharedAt: "1d ago",
  },
  {
    id: "pin-4",
    lat: 40.4390,
    lng: -79.9573,
    title: "The Friendliest Dog Park",
    description: "A small off-leash park where the golden retriever named Mochi greets everyone. He's been the unofficial mayor since 2022.",
    emoji: "🐕",
    imageUrl: "https://picsum.photos/seed/pin4/600/400",
    author: "mochi_fan",
    sharedAt: "3h ago",
  },
  {
    id: "pin-5",
    lat: 40.4451,
    lng: -79.9602,
    title: "Secret Rooftop View",
    description: "Climb the Shadyside stairs and you'll find a perfect framed view of the Pittsburgh skyline at sunset.",
    emoji: "🌅",
    imageUrl: "https://picsum.photos/seed/pin5/600/400",
    author: "sunset_chaser",
    sharedAt: "6h ago",
  },
  {
    id: "pin-6",
    lat: 40.4418,
    lng: -79.9487,
    title: "Bubble Tea Cart",
    description: "A pop-up cart that appears Tue–Sat from 11am. The taro milk tea with tapioca is worth the detour.",
    emoji: "🧋",
    imageUrl: "https://picsum.photos/seed/pin6/600/400",
    author: "boba_addict",
    sharedAt: "30m ago",
  },
  {
    id: "pin-7",
    lat: 40.4524,
    lng: -79.9441,
    title: "The Wishing Fountain",
    description: "A small fountain near the CMU gates. Students have been tossing coins here before exams since 1963.",
    emoji: "⛲",
    imageUrl: "https://picsum.photos/seed/pin7/600/400",
    author: "cmu_2024",
    sharedAt: "1d ago",
  },
  {
    id: "pin-8",
    lat: 40.4462,
    lng: -79.9545,
    title: "Street Mural — 'Persistence'",
    description: "A stunning 3-story mural painted by local artist Maya Osei. A woman's hands holding seeds. Breathtaking up close.",
    emoji: "🖼️",
    imageUrl: "https://picsum.photos/seed/pin8/600/400",
    author: "maya_osei",
    sharedAt: "2d ago",
  },
  {
    id: "pin-9",
    lat: 40.4409,
    lng: -79.9412,
    title: "Lavender Bench",
    description: "A single purple bench under an oak tree. Someone always leaves a kind note tucked underneath it.",
    emoji: "💜",
    imageUrl: "https://picsum.photos/seed/pin9/600/400",
    author: "kindness_pgh",
    sharedAt: "4h ago",
  },
  {
    id: "pin-10",
    lat: 40.4488,
    lng: -79.9328,
    title: "Night Jazz Alley",
    description: "On Friday nights a saxophonist plays here from 9–11pm. No crowds, just the music floating down the alley.",
    emoji: "🎷",
    imageUrl: "https://picsum.photos/seed/pin10/600/400",
    author: "jazz_nightwalk",
    sharedAt: "12h ago",
  },
];
