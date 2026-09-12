import { Pin } from "./mockPins";

export type GeoPoint = { lat: number; lng: number };

function haversine(a: GeoPoint, b: GeoPoint) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 12_742_000 * Math.asin(Math.sqrt(value));
}

export async function buildWalkingDistanceMatrix(points: GeoPoint[]) {
  if (typeof google !== "undefined") {
    try {
      const service = new google.maps.DirectionsService();
      const size = points.length;
      const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
      const pairJobs: Array<{
        i: number;
        j: number;
        promise: Promise<number>;
      }> = [];

      for (let i = 0; i < size; i += 1) {
        for (let j = i + 1; j < size; j += 1) {
          pairJobs.push({
            i,
            j,
            promise: new Promise<number>((resolve) => {
              service.route(
                {
                  origin: points[i],
                  destination: points[j],
                  travelMode: google.maps.TravelMode.WALKING,
                },
                (result, status) => {
                  if (status === google.maps.DirectionsStatus.OK) {
                    const meters = result?.routes?.[0]?.legs?.[0]?.distance?.value;
                    if (typeof meters === "number") {
                      resolve(meters);
                      return;
                    }
                  }
                  resolve(haversine(points[i], points[j]));
                },
              );
            }),
          });
        }
      }

      const results = await Promise.all(pairJobs.map((job) => job.promise));
      pairJobs.forEach((job, index) => {
        const meters = results[index] ?? haversine(points[job.i], points[job.j]);
        matrix[job.i][job.j] = meters;
        matrix[job.j][job.i] = meters;
      });

      return matrix;
    } catch {
      // Keep the app usable if Directions API is unavailable in the browser.
    }
  }
  return points.map((from) => points.map((to) => haversine(from, to)));
}

function permutations(values: number[]): number[][] {
  if (values.length < 2) return [values];
  return values.flatMap((value, index) => permutations(values.filter((_, itemIndex) => itemIndex !== index)).map((rest) => [value, ...rest]));
}

function cost(order: number[], matrix: number[][], endIndex: number) {
  const path = [0, ...order, endIndex];
  return path.slice(1).reduce((total, node, index) => total + matrix[path[index]][node], 0);
}

export function findOptimalVisitOrder<T extends Pin>(spots: T[], matrix: number[][]) {
  const indices = spots.map((_, index) => index + 1);
  const endIndex = spots.length + 1;
  const originalMeters = cost(indices, matrix, endIndex);
  const best = permutations(indices).reduce((winner, order) => {
    const meters = cost(order, matrix, endIndex);
    return meters < winner.meters ? { order, meters } : winner;
  }, { order: indices, meters: originalMeters });
  return {
    spots: best.order.map((index) => spots[index - 1]),
    meters: best.meters,
    originalMeters,
    savedMeters: Math.max(0, originalMeters - best.meters),
  };
}
