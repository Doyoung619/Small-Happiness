import { Pin } from "./mockPins";

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Compute a bounding box between two LatLng points, expanded by a padding factor.
 * Padding of 0.3 means the box extends 30% beyond the straight-line A→B envelope.
 */
export function getBoundingBox(
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral,
  padding = 0.3
): BoundingBox {
  const latDiff = Math.abs(destination.lat - origin.lat);
  const lngDiff = Math.abs(destination.lng - origin.lng);
  const latPad = Math.max(latDiff * padding, 0.005);
  const lngPad = Math.max(lngDiff * padding, 0.005);

  return {
    minLat: Math.min(origin.lat, destination.lat) - latPad,
    maxLat: Math.max(origin.lat, destination.lat) + latPad,
    minLng: Math.min(origin.lng, destination.lng) - lngPad,
    maxLng: Math.max(origin.lng, destination.lng) + lngPad,
  };
}

/** Filter pins that fall within the bounding box */
export function filterPinsInBox(pins: Pin[], bbox: BoundingBox): Pin[] {
  return pins.filter(
    (p) =>
      p.lat >= bbox.minLat &&
      p.lat <= bbox.maxLat &&
      p.lng >= bbox.minLng &&
      p.lng <= bbox.maxLng
  );
}

/** Build a Directions API request with waypoints */
export function buildDirectionsRequest(
  origin: string,
  destination: string,
  waypoints: Pin[]
): google.maps.DirectionsRequest {
  return {
    origin,
    destination,
    travelMode: google.maps.TravelMode.WALKING,
    waypoints: waypoints.map((p) => ({
      location: new google.maps.LatLng(p.lat, p.lng),
      stopover: false,
    })),
    optimizeWaypoints: false,
  };
}
