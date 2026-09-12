import { clusterPins } from "./clustering";
import { MOCK_PINS } from "./mockPins";
import { buildMockInteractions } from "./mockInteractions";
import { rankJoySpots, toJoySpot } from "./recommendation";
import { findOptimalVisitOrder } from "./routeOptimization";

const spots = MOCK_PINS.map(toJoySpot);
const interactions = buildMockInteractions(spots);
const topCategories = ["Doyoung", "Mina", "Alex"].map((persona) => rankJoySpots(persona, spots, interactions)[0].category);
if (new Set(topCategories).size !== 3) throw new Error(`Personas did not diverge: ${topCategories.join(", ")}`);

const optimized = findOptimalVisitOrder(MOCK_PINS.slice(0, 3), [
  [0, 10, 1, 8, 20],
  [10, 0, 1, 1, 8],
  [1, 1, 0, 10, 10],
  [8, 1, 10, 0, 1],
  [20, 8, 10, 1, 0],
]);
if (optimized.spots.map((spot) => spot.id).join(",") !== "pin-2,pin-1,pin-3") throw new Error("Hamiltonian path was not optimized");
if (clusterPins(MOCK_PINS, 11).length >= clusterPins(MOCK_PINS, 18).length) throw new Error("Clusters did not expand with zoom");

console.log(`recommendations=${topCategories.join("/")} optimized=${optimized.meters}m clusters=ok`);
