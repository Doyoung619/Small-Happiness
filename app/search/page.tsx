"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { useAuth } from "@/components/AuthProvider";
import { subscribeToProfile, UserProfile } from "@/lib/friends";
import { Joy, subscribeToJoys } from "@/lib/joys";
import { buildMockInteractions } from "@/lib/mockInteractions";
import { rankJoySpots, toJoySpot } from "@/lib/recommendation";
import { buildWalkingDistanceMatrix, findOptimalVisitOrder, GeoPoint } from "@/lib/routeOptimization";
import { filterPinsInBox, getBoundingBox } from "@/lib/routing";
import MapViewer from "@/components/MapViewer";

const libraries: ("places")[] = ["places"];
type PlaceChoice = { label: string; location?: GeoPoint };
type RecommendedSpot = ReturnType<typeof rankJoySpots>[number];
type RouteCandidate = {
  id: string;
  title: string;
  spots: RecommendedSpot[];
  meters: number;
  distance: string;
  minutes: number;
  detourMinutes: number;
  savedMinutes: number;
  avgMatch: number;
  tags: string[];
};

function haversine(a: GeoPoint, b: GeoPoint) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 12_742_000 * Math.asin(Math.sqrt(value));
}

async function buildSingleRoute(origin: GeoPoint, destination: GeoPoint, selected: RecommendedSpot[]): Promise<RouteCandidate | null> {
  if (!selected.length) return null;
  const points = [origin, ...selected.map(({ lat, lng }) => ({ lat, lng })), destination];
  const matrix = await buildWalkingDistanceMatrix(points);
  const optimized = findOptimalVisitOrder(selected, matrix);
  const directMeters = matrix[0][matrix.length - 1] ?? optimized.meters;
  return {
    id: selected.map((spot) => spot.id).join("-"),
    title: "Recommended Loop",
    spots: optimized.spots,
    meters: optimized.meters,
    distance: `${(optimized.meters / 1609.344).toFixed(1)} mi`,
    minutes: Math.max(1, Math.round(optimized.meters / 80)),
    detourMinutes: Math.max(0, Math.round((optimized.meters - directMeters) / 80)),
    savedMinutes: Math.max(0, Math.round(optimized.savedMeters / 80)),
    avgMatch: Math.round(selected.reduce((sum, spot) => sum + (spot.recommendation?.match ?? 0), 0) / selected.length),
    tags: ["Optimized order", `Includes ${selected.length} joy bubbles`],
  };
}

function normalizeGeo(location: GeoPoint): string {
  if (!location) return "";
  const roundedLat = Math.round(location.lat * 1e4) / 1e4;
  const roundedLng = Math.round(location.lng * 1e4) / 1e4;
  return `${roundedLat},${roundedLng}`;
}

function candidateKey(spots: string[]) {
  return [...spots].sort().join("|");
}

export default function SearchPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [origin, setOrigin] = useState<PlaceChoice>({ label: "" });
  const [destination, setDestination] = useState<PlaceChoice>({ label: "" });
  const [activeSearch, setActiveSearch] = useState<"origin" | "dest" | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [joys, setJoys] = useState<Joy[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [routeCandidates, setRouteCandidates] = useState<RouteCandidate[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useJsApiLoader({ id: "google-map-script", googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "", libraries });
  const previewRoute = routeCandidates[selectedRouteIndex];
  useEffect(() => {
    if (!user) return;
    return subscribeToProfile(user.uid, setProfile, () => setError("Could not load Profile."));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeToJoys(setJoys, () => setError("Could not load Joy Spots."), profile?.language);
  }, [user, profile?.language]);

  useEffect(() => {
    if (!isLoaded || !origin.location || !destination.location || joys.length < 2) {
      return;
    }
    let cancelled = false;
    const run = async () => {
      setRouteCandidates([]);
      setPlanning(true);
      setError("");
      const nearby = filterPinsInBox(joys, getBoundingBox(origin.location!, destination.location!, 0.5));
      const candidates = nearby.length >= 2 ? nearby : joys;
      const interactions = buildMockInteractions(candidates.map(toJoySpot));
      const ranked = rankJoySpots("Doyoung", candidates, interactions);

      const directDistanceSort = [...ranked].map((spot) => ({
        spot,
        score: haversine(spot as GeoPoint, origin.location!) + haversine(spot as GeoPoint, destination.location!),
      })).sort((a, b) => a.score - b.score).map((entry) => entry.spot);

      const categoryOrder: string[] = ["nature", "cafe", "art", "music", "food", "view", "dog", "other"];
      const byCategory: RecommendedSpot[] = [];
      categoryOrder.forEach((category) => {
        const pick = ranked.find((spot) => spot.category === category && !byCategory.some((added) => added.id === spot.id));
        if (pick) byCategory.push(pick);
      });
      const fillFromRanked = [...byCategory];
      ranked.forEach((spot) => {
        if (!fillFromRanked.some((picked) => picked.id === spot.id)) fillFromRanked.push(spot);
      });

      const candidateSets = [
        { title: "Flavor-First Route", spots: ranked.slice(0, 3), tags: ["Taste match", "Top highlights"] },
        { title: "Distance-First Route", spots: directDistanceSort.slice(0, 3), tags: ["Short distance", "Efficient flow"] },
        { title: "Balanced-Style Route", spots: fillFromRanked.slice(0, 3), tags: ["Theme variety", "Fresh rhythm"] },
      ];

      const planned: RouteCandidate[] = [];
      const used = new Set<string>();

      for (const candidate of candidateSets) {
        const points = candidate.spots.filter((spot, index) => index < 4);
        if (points.length < 2) continue;
        const key = candidateKey(points.map((spot) => spot.id));
        if (used.has(key)) continue;
        used.add(key);
        const route = await buildSingleRoute(origin.location!, destination.location!, points);
        if (!route) continue;
        planned.push({ ...route, title: candidate.title, tags: candidate.tags });
      }

      if (!cancelled) {
        setRouteCandidates(planned);
        setSelectedRouteIndex((index) => Math.min(index, Math.max(0, planned.length - 1)));
      }
    };

    run().catch(() => {
      if (!cancelled) setError("Could not build this route. Try another place.");
    }).finally(() => {
      if (!cancelled) setPlanning(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, origin.location, destination.location, joys]);

  const choosePlace = (place: PlaceChoice) => {
    setRouteCandidates([]);
    setSelectedRouteIndex(0);
    if (activeSearch === "origin") setOrigin(place);
    if (activeSearch === "dest") setDestination(place);
    setActiveSearch(null);
    setSearchInput("");
  };

  const onPlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    const location = place?.geometry?.location;
    const label = place?.name || place?.formatted_address;
    if (label && location) choosePlace({ label, location: { lat: location.lat(), lng: location.lng() } });
  };

  const chooseCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => choosePlace({ label: "Current Location", location: { lat: coords.latitude, lng: coords.longitude } }),
      () => setError("Location permission is required for Current Location."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const routeHref = (route: RouteCandidate) => {
    if (!route || !origin.location || !destination.location) return "/";
    const params = new URLSearchParams({
      origin: origin.label,
      dest: destination.label,
      olat: String(origin.location.lat),
      olng: String(origin.location.lng),
      dlat: String(destination.location.lat),
      dlng: String(destination.location.lng),
      spots: route.spots.map((spot) => spot.id).join(","),
      persona: "Doyoung",
      minutes: String(route.minutes),
      detour: String(route.detourMinutes),
      saved: String(route.savedMinutes),
    });
    return `/?${params}`;
  };

  const selectRoute = (index: number) => {
    const scrollTop = scrollRef.current?.scrollTop;
    setSelectedRouteIndex(index);
    requestAnimationFrame(() => {
      if (scrollRef.current && scrollTop !== undefined) scrollRef.current.scrollTop = scrollTop;
    });
  };

  return (
    <div ref={scrollRef} className="scroll-page" style={{ minHeight: "100vh", background: "var(--bg-base)", color: "#fff" }}>
      <main style={{ display: activeSearch ? "none" : "block", width: "min(680px, 100%)", margin: "0 auto", paddingBottom: "calc(env(safe-area-inset-bottom) + 140px)" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, padding: 20 }}>
          <button onClick={() => router.back()} aria-label="Back" className="pressable" style={roundButton}>←</button>
          <strong style={{ fontFamily: "var(--font-display)" }}>Find Joy Route</strong>
        </header>

        <section style={{ padding: "0 20px 18px" }}>
          <div style={{ position: "relative", padding: 18, borderRadius: 24, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}>
            <PlaceButton label="FROM" color="#a3e635" value={origin.label} placeholder="Choose starting point" onClick={() => { setActiveSearch("origin"); setSearchInput(origin.label); }} />
            <div style={{ height: 12 }} />
            <PlaceButton label="TO" color="#f472b6" value={destination.label} placeholder="Choose destination" onClick={() => { setActiveSearch("dest"); setSearchInput(destination.label); }} />
            <button
              type="button"
              aria-label="Swap locations"
              onClick={() => {
                setRouteCandidates([]);
                setSelectedRouteIndex(0);
                setOrigin(destination);
                setDestination(origin);
              }}
              className="pressable"
              style={{ ...roundButton, position: "absolute", width: 34, height: 34, right: 28, top: "50%", transform: "translateY(-50%)" }}
            >
              ↕
            </button>
          </div>
        </section>

        <section aria-live="polite" style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {planning && <div style={statusCard}>✨ Personalizing and optimizing your route…</div>}
          {error && <p role="alert" style={{ ...statusCard, color: "#f87171" }}>{error}</p>}
          {!planning && !routeCandidates.length && !error && <div style={statusCard}>Choose FROM and TO to build route options.</div>}

          {routeCandidates.length > 0 && (
            <>
              <div style={{ marginTop: 4, borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,.12)" }}>
              <div style={{ position: "relative", width: "100%", height: "42dvh" }}>
                <MapViewer
                  pins={previewRoute ? previewRoute.spots : []}
                  center={origin.location ?? { lat: 40.4433, lng: -79.9436 }}
                  zoom={15}
                  origin={origin.location ? normalizeGeo(origin.location) : null}
                  destination={destination.location ? normalizeGeo(destination.location) : null}
                  waypoints={previewRoute ? previewRoute.spots : []}
                />
                </div>
              </div>

              {routeCandidates.map((route, index) => {
                const isFocused = index === selectedRouteIndex;
                return (
                  <div
                    key={route.id}
                    className="pressable"
                    role="button"
                    onClick={() => selectRoute(index)}
                    style={{
                      width: "100%",
                      padding: 18,
                      borderRadius: 22,
                      border: isFocused ? "1px solid rgba(116,108,255,.45)" : "1px solid rgba(255,255,255,.12)",
                      background: isFocused ? "linear-gradient(135deg,rgba(116,108,255,.2),rgba(72,168,255,.1))" : "rgba(255,255,255,.04)",
                      color: "inherit",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <strong style={{ fontFamily: "var(--font-display)" }}>{route.title}</strong>
                        <p style={{ marginTop: 6, color: "#a3e635", fontSize: 12 }}>{route.tags.join(" · ")}</p>
                      </div>
                      <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <strong style={{ color: "#7fb0ff" }}>{route.distance}</strong>
                        <p style={{ color: "#a3e635", fontSize: 13 }}>{route.minutes} min</p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 12px" }}>
                      <i style={{ ...routeDot, background: "#7fb0ff" }} />
                      {route.spots.map((spot) => <span key={spot.id} style={{ display: "contents" }}><b style={routeLine} /><span title={spot.title} style={{ fontSize: 22 }}>{spot.emoji}</span></span>)}
                      <b style={routeLine} />
                      <i style={{ ...routeDot, background: "#ff7ab6" }} />
                    </div>

                    <p style={{ color: "rgba(255,255,255,.45)", fontSize: 12, marginBottom: 10 }}>
                      Avg match: {route.avgMatch}%
                    </p>

                    <Link href={routeHref(route)} className="pressable" style={{ display: "inline-flex", padding: "8px 14px", borderRadius: 14, background: "rgba(255,255,255,.14)", textDecoration: "none", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                      See this route on map
                    </Link>
                  </div>
                );
              })}
            </>
          )}
        </section>
      </main>

      {activeSearch && (
        <div className="scroll-page" style={{ position: "fixed", inset: 0, zIndex: 100, background: "var(--bg-base)" }}>
          <header style={{ display: "flex", alignItems: "center", gap: 12, padding: 20 }}>
            <button onClick={() => setActiveSearch(null)} aria-label="Back" className="pressable" style={roundButton}>←</button>
            <strong>{activeSearch === "origin" ? "Enter Starting Point" : "Enter Destination"}</strong>
          </header>
          <div style={{ padding: "0 20px", width: "min(680px, 100%)", margin: "0 auto" }}>
            {isLoaded ? (
              <Autocomplete
                onLoad={(autocomplete) => {
                  autocompleteRef.current = autocomplete;
                }}
                onPlaceChanged={onPlaceChanged}
                options={{ fields: ["name", "geometry", "formatted_address"] }}
              >
                <input autoFocus value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search for a place…" className="joy-input" style={{ padding: 16, fontSize: 16 }} />
              </Autocomplete>
            ) : (
              <div style={statusCard}>Loading places…</div>
            )}
            <button onClick={chooseCurrentLocation} className="pressable" style={{ marginTop: 16, width: "100%", padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#fff", textAlign: "left", fontWeight: 700 }}>📍 Use Current Location</button>
            {error && <p role="alert" style={{ marginTop: 12, color: "#f87171", fontSize: 13 }}>{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceButton({ label, color, value, placeholder, onClick }: { label: string; color: string; value: string; placeholder: string; onClick: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 42, color, fontSize: 12, fontWeight: 800 }}>{label}</span>
      <button onClick={onClick} style={{ flex: 1, marginRight: 38, padding: "13px 14px", borderRadius: 13, border: "1px solid rgba(255,255,255,.1)", background: "rgba(0,0,0,.2)", color: value ? "#fff" : "rgba(255,255,255,.4)", textAlign: "left", cursor: "pointer", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{value || placeholder}</button>
    </div>
  );
}

const roundButton = { width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.1)", color: "#fff", cursor: "pointer" } as const;
const statusCard = { padding: 18, borderRadius: 18, background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.55)", fontSize: 13 } as const;
const routeDot = { width: 11, height: 11, borderRadius: "50%", flexShrink: 0 } as const;
const routeLine = { height: 2, flex: 1, background: "rgba(255,255,255,.13)" } as const;
