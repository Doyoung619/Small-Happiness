"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import JoyCard from "@/components/JoyCard";
import MapViewer from "@/components/MapViewer";
import { subscribeToProfile, UserProfile } from "@/lib/friends";
import { Joy, subscribeToJoys } from "@/lib/joys";
import { buildMockInteractions, Persona, PERSONAS } from "@/lib/mockInteractions";
import { rankJoySpots, toJoySpot } from "@/lib/recommendation";
import { tagLabel } from "@/lib/tags";

const DEFAULT_CENTER = { lat: 40.4433, lng: -79.9436 };

function coordinate(lat: string | null, lng: string | null) {
  if (lat === null || lng === null) return null;
  const point = { lat: Number(lat), lng: Number(lng) };
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) ? point : null;
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 12_742 * Math.asin(Math.sqrt(value));
}

function MapPageContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user } = useAuth();
  const [joys, setJoys] = useState<Joy[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mapFilter, setMapFilter] = useState<"all" | "public" | "friends">("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedJoy, setSelectedJoy] = useState<Joy | null>(null);
  const [clusterPins, setClusterPins] = useState<Joy[]>([]);
  const [clusterFocusedPinId, setClusterFocusedPinId] = useState<string | null>(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");
  const [routeSummaryOpen, setRouteSummaryOpen] = useState(true);
  const [locatePulse, setLocatePulse] = useState(false);
  const locatePulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const originStr = searchParams.get("origin");
  const destStr = searchParams.get("dest");
  const spotIds = searchParams.get("spots") ?? "";
  const routeIds = useMemo(() => spotIds.split(",").filter(Boolean), [spotIds]);
  const personaParam = searchParams.get("persona");
  const persona: Persona = personaParam && personaParam in PERSONAS ? (personaParam as Persona) : "Doyoung";

  const friendIds = useMemo(() => profile?.friendIds || [], [profile]);
  const scopeJoys = useMemo(() => {
    if (mapFilter === "public") return joys.filter((joy) => joy.visibility === "public");
    if (mapFilter === "friends") return joys.filter((joy) => friendIds.includes(joy.authorId));
    return joys;
  }, [friendIds, joys, mapFilter]);

  const nearbyTagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const location = userLocation || DEFAULT_CENTER;
    scopeJoys.filter((joy) => distanceKm(location, joy) <= 5).forEach((joy) => {
      joy.tags?.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
    });
    return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [scopeJoys, userLocation]);

  const visibleJoys = useMemo(() => selectedTags.length
    ? scopeJoys.filter((joy) => joy.tags?.some((tag) => selectedTags.includes(tag)))
    : scopeJoys,
  [scopeJoys, selectedTags]);

  const displayJoys = useMemo(() => {
    if (!routeIds.length) return visibleJoys;
    const interactions = buildMockInteractions(visibleJoys.map(toJoySpot));
    return rankJoySpots(persona, visibleJoys, interactions);
  }, [visibleJoys, persona, routeIds.length]);

  const routeWaypoints = useMemo(
    () => routeIds.map((id) => displayJoys.find((joy) => joy.id === id)).filter((joy): joy is NonNullable<typeof joy> => !!joy),
    [displayJoys, routeIds],
  );

  const originLat = searchParams.get("olat");
  const originLng = searchParams.get("olng");
  const destinationLat = searchParams.get("dlat");
  const destinationLng = searchParams.get("dlng");
  const originPoint = coordinate(originLat, originLng);
  const destinationPoint = coordinate(destinationLat, destinationLng);
  const routeOrigin = originPoint ? `${originPoint.lat},${originPoint.lng}` : originStr;
  const routeDestination = destinationPoint ? `${destinationPoint.lat},${destinationPoint.lng}` : destStr;
  const routeStats = {
    minutes: Number(searchParams.get("minutes")) || 0,
    detourMinutes: Number(searchParams.get("detour")) || 0,
    savedMinutes: Number(searchParams.get("saved")) || 0,
  };

  const focusedPinId = selectedJoy?.id ?? clusterFocusedPinId;

  useEffect(() => {
    if (!user) return;
    return subscribeToProfile(user.uid, setProfile, () => setError("Could not load profile yet."));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeToJoys(setJoys, () => setError("Could not load joys yet."), profile?.language);
  }, [user, profile?.language]);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => setUserLocation({ lat: coords.latitude, lng: coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const locateMe = () => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = { lat: coords.latitude, lng: coords.longitude };
        setUserLocation(location);
        setCenter(location);
        setLocatePulse(true);
        if (locatePulseTimer.current) {
          clearTimeout(locatePulseTimer.current);
        }
        locatePulseTimer.current = setTimeout(() => setLocatePulse(false), 900);
      },
      () => setError("Location permission is needed to find you."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useEffect(() => {
    return () => {
      if (locatePulseTimer.current) {
        clearTimeout(locatePulseTimer.current);
      }
    };
  }, []);

  const closeCluster = () => {
    setClusterPins([]);
    setClusterFocusedPinId(null);
  };

  const showClusterPin = (offset: number) => {
    if (!clusterPins.length) return;
    const index = clusterPins.findIndex((pin) => pin.id === selectedJoy?.id);
    const pin = clusterPins[(index + offset + clusterPins.length) % clusterPins.length];
    setSelectedJoy(pin);
    setClusterFocusedPinId(pin.id);
    setCenter({ lat: pin.lat, lng: pin.lng });
  };

  const nextMapFilter = () => {
    setSelectedTags([]);
    setMapFilter((filter) => filter === "all" ? "public" : filter === "public" ? "friends" : "all");
  };

    return (
    <div style={{ position: "relative", width: "100%", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
      {pathname === "/" && (
        <div
          style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top) + 12px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            width: "min(720px, calc(100% - 24px))",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "nowrap",
            pointerEvents: "auto",
          }}
        >
          <Link
            href="/search"
            aria-label="Search joy routes"
            className="pressable"
            style={{
              flex: 1,
              minWidth: 0,
              height: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "13px 16px",
              borderRadius: 16,
              color: "#fff",
              background: "rgba(13, 12, 20, 0.88)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(18px)",
              textDecoration: "none",
              fontSize: 14,
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              overflow: "hidden",
            }}
          >
            <span style={{ display: "inline-flex", gap: 10, alignItems: "center", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              <span style={{ fontSize: 17, flexShrink: 0 }}>🔍</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>Search joy routes</span>
            </span>
            <span style={{ fontSize: 12, opacity: 0.55, marginLeft: 10, flexShrink: 0 }}>Tap</span>
          </Link>

          <button
            type="button"
            onClick={nextMapFilter}
            aria-label={`Map filter: ${mapFilter}`}
            title={`Map filter: ${mapFilter}`}
            className="pressable"
            style={{
              width: 52,
              height: 52,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(13, 12, 20, 0.8)",
              border: "1px solid rgba(255,255,255,.12)",
              color: "#fff",
              boxShadow: "0 10px 24px rgba(0,0,0,.28)",
              flexShrink: 0,
            }}
          >
            <span style={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", background: mapFilter === "all" ? "rgba(139,92,246,.35)" : mapFilter === "public" ? "rgba(96,165,250,.28)" : "rgba(163,230,53,.22)", fontSize: 16, fontWeight: 900 }}>
              {mapFilter === "all" ? "A" : mapFilter === "public" ? "P" : "F"}
            </span>
          </button>

          <Link
            href="/menu"
            aria-label="메뉴"
            className="pressable"
            style={{
              width: 52,
              height: 52,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(13, 12, 20, 0.8)",
              border: "1px solid rgba(255,255,255,.12)",
              color: "rgba(255, 255, 255, 0.6)",
              textDecoration: "none",
              gap: 0,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>☰</span>
          </Link>
        </div>
      )}

      {pathname === "/" && nearbyTagCounts.length > 0 && (
        <div style={{ position: "fixed", top: "calc(env(safe-area-inset-top) + 74px)", left: "50%", transform: "translateX(-50%)", zIndex: 59, width: "min(720px, calc(100% - 24px))", display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
          {nearbyTagCounts.map(({ tag, count }) => {
            const selected = selectedTags.includes(tag);
            return <button key={tag} type="button" aria-pressed={selected} onClick={() => setSelectedTags((tags) => tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag])} className="pressable" style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 999, border: selected ? "1px solid rgba(255,255,255,.65)" : "1px solid rgba(255,255,255,.14)", background: selected ? "rgba(126,107,255,.92)" : "rgba(13,12,20,.82)", backdropFilter: "blur(16px)", color: "#fff", fontSize: 12, fontWeight: 700 }}>#{tagLabel(tag, profile?.language)} {count}</button>;
          })}
        </div>
      )}

      <div style={{ position: "absolute", inset: 0 }}>
        <MapViewer
          pins={displayJoys}
          center={center}
          zoom={15}
          origin={routeOrigin}
          destination={routeDestination}
          waypoints={routeWaypoints}
          activePinId={focusedPinId}
          userLocation={userLocation}
          onPinClick={(pin) => {
            setSelectedJoy(pin as Joy);
            setClusterPins([]);
            setClusterFocusedPinId(pin.id);
            setCenter({ lat: pin.lat, lng: pin.lng });
            setRouteSummaryOpen(false);
          }}
          onClusterOpen={(pins) => {
            const cluster = pins as Joy[];
            const first = cluster[0];
            if (!first) return;
            setClusterPins(cluster);
            setSelectedJoy(first);
            setClusterFocusedPinId(first.id);
            setCenter({ lat: first.lat, lng: first.lng });
            setRouteSummaryOpen(false);
          }}
          onMapClick={() => {
            setSelectedJoy(null);
            setRouteSummaryOpen(false);
            closeCluster();
          }}
        />
      </div>

      {clusterPins.length > 1 && selectedJoy && (
        <>
          <button type="button" aria-label="Previous bubble" onClick={() => showClusterPin(-1)} className="pressable" style={{ position: "fixed", left: "max(8px, calc(50% - 238px))", top: "50%", transform: "translateY(-50%)", zIndex: 1100, width: 44, height: 56, borderRadius: 999, border: "1px solid rgba(255,255,255,.2)", background: "rgba(13,12,20,.82)", color: "#fff", fontSize: 24 }}>‹</button>
          <button type="button" aria-label="Next bubble" onClick={() => showClusterPin(1)} className="pressable" style={{ position: "fixed", right: "max(8px, calc(50% - 238px))", top: "50%", transform: "translateY(-50%)", zIndex: 1100, width: 44, height: 56, borderRadius: 999, border: "1px solid rgba(255,255,255,.2)", background: "rgba(13,12,20,.82)", color: "#fff", fontSize: 24 }}>›</button>
        </>
      )}

      {error && (
        <p role="alert" style={{ position: "fixed", left: 16, bottom: "calc(var(--app-map-floating-offset) + 132px)", zIndex: 70, maxWidth: "calc(100% - 32px)", padding: "10px 12px", borderRadius: 12, background: "rgba(127,29,29,.9)", color: "#fff", fontSize: 12 }}>
          {error}
        </p>
      )}

      <div
        style={{
          position: "fixed",
          right: 18,
          bottom: "calc(var(--app-map-floating-offset) - 14px)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          alignItems: "center",
          zIndex: 50,
          pointerEvents: "none",
        }}
      >
        <button
          onClick={locateMe}
          aria-label="Show my location"
          className={`pressable locate-fab ${locatePulse ? "locate-pulse" : ""}`}
          type="button"
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            background: "rgba(18,20,27,.92)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,.14)",
            color: "#fff",
            fontSize: 24,
            boxShadow: "0 10px 30px rgba(0,0,0,.35)",
            cursor: "pointer",
            pointerEvents: "auto",
            position: "relative",
          }}
        >
          <span style={{ fontSize: 22 }}>📍</span>
        </button>

        <Link
          href="/add"
          aria-label="Add bubble"
          className="pressable"
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            background: "linear-gradient(135deg,rgba(123,110,255,.95),rgba(244,115,177,.95))",
            color: "#fff",
            fontSize: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 12px 28px rgba(123,110,255,.45)",
            textDecoration: "none",
            pointerEvents: "auto",
          }}
        >
          ✨
        </Link>
      </div>

      <JoyCard
        pin={selectedJoy}
        waypoints={routeSummaryOpen ? routeWaypoints : []}
        routeStats={routeStats.minutes ? routeStats : undefined}
        onClose={() => {
          if (clusterPins.length) closeCluster();
          if (selectedJoy) setSelectedJoy(null);
          else setRouteSummaryOpen(false);
        }}
      />
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div style={{ width: "100%", height: "100vh", background: "var(--bg-base)" }} />}>
      <MapPageContent />
    </Suspense>
  );
}
