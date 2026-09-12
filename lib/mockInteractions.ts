import { JoyCategory } from "./mockPins";
import { JoySpot, UserInteraction } from "./recommendation";

export const PERSONAS = {
  Doyoung: ["nature", "dog", "view"],
  Mina: ["cafe", "food", "other"],
  Alex: ["art", "music", "other"],
} satisfies Record<string, JoyCategory[]>;

export type Persona = keyof typeof PERSONAS;

const MOCK_USERS: Array<[string, JoyCategory[]]> = [
  ...Object.entries(PERSONAS),
  ["u04", ["nature", "dog", "view"]],
  ["u05", ["dog", "nature"]],
  ["u06", ["view", "nature", "art"]],
  ["u07", ["cafe", "food"]],
  ["u08", ["food", "cafe", "nature"]],
  ["u09", ["cafe", "music"]],
  ["u10", ["art", "music"]],
  ["u11", ["music", "other", "art"]],
  ["u12", ["art", "view"]],
  ["u13", ["nature", "food"]],
  ["u14", ["dog", "other"]],
  ["u15", ["view", "cafe"]],
];

export function buildMockInteractions(spots: JoySpot[]): UserInteraction[] {
  return MOCK_USERS.flatMap(([userId, likedCategories], userIndex) =>
    spots.map((spot, spotIndex) => {
      const liked = likedCategories.includes(spot.category);
      const primary = likedCategories[0] === spot.category;
      return {
        userId,
        spotId: spot.id,
        liked,
        saved: liked && (primary || (userIndex + spotIndex) % 2 === 0),
        visited: liked || (userIndex + spotIndex) % 5 === 0,
        skipped: !liked && (userIndex + spotIndex) % 3 === 0,
      };
    }),
  );
}
