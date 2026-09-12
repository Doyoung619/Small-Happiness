import { Pin } from "./mockPins";

export type PinCluster = { id: string; lat: number; lng: number; pins: Pin[] };

export function clusterPins(pins: Pin[], zoom: number, cellSize = 72): PinCluster[] {
  const scale = 256 * 2 ** zoom;
  const groups: Array<{ x: number; y: number; pins: Pin[] }> = [];
  pins.forEach((pin) => {
    const sin = Math.sin(pin.lat * Math.PI / 180);
    const x = ((pin.lng + 180) / 360) * scale;
    const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
    const group = groups.find((candidate) => Math.hypot(candidate.x - x, candidate.y - y) < cellSize);
    if (group) {
      group.pins.push(pin);
      group.x += (x - group.x) / group.pins.length;
      group.y += (y - group.y) / group.pins.length;
    } else {
      groups.push({ x, y, pins: [pin] });
    }
  });
  return groups.map(({ pins: grouped }) => ({
    id: grouped.map((pin) => pin.id).sort().join(":"),
    pins: grouped,
    lat: grouped.reduce((sum, pin) => sum + pin.lat, 0) / grouped.length,
    lng: grouped.reduce((sum, pin) => sum + pin.lng, 0) / grouped.length,
  }));
}
