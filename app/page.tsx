"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import JoyCard from "@/components/JoyCard";
import MapViewer from "@/components/MapViewer";
import { Joy, subscribeToJoys } from "@/lib/joys";
import { buildMockInteractions, Persona, PERSONAS } from "@/lib/mockInteractions";
import { rankJoySpots, toJoySpot } from "@/lib/recommendation";

const DEFAULT_CENTER = { lat: 40.4433, lng: -79.9436 };

function coordinate(lat: string | null, lng: string | null) {
  if (lat === null || lng === null) return null;
  const point = { lat: Number(lat), lng: Number(lng) };
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) ? point : null;
}

function MapPageContent() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [joys, setJoys] = useState<Joy[]>([]);
  const [selectedJoy, setSelectedJoy] = useState<Joy | null>(null);
  const [clusterPins, setClusterPins] = useState<Joy[]>([]);
  const [clusterFocusedPinId, setClusterFocusedPinId] = useState<string | null>(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [error, setError] = useState("");
  const [routeSummaryOpen, setRouteSummaryOpen] = useState(true);

  const originStr = searchParams.get("origin");
  const destStr = searchParams.get("dest");
  const spotIds = searchParams.get("spots") ?? "";
  const routeIds = useMemo(() => spotIds.split(",").filter(Boolean), [spotIds]);
  const personaParam = searchParams.get("persona");
  const persona: Persona = personaParam && personaParam in PERSONAS ? (personaParam as Persona) : "Doyoung";

  const displayJoys = useMemo(() => {
    if (!routeIds.length) return joys;
    const interactions = buildMockInteractions(joys.map(toJoySpot));
    return rankJoySpots(persona, joys, interactions);
  }, [joys, persona, routeIds.length]);

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
    return subscribeToJoys(setJoys, () => setError("Could not load joys yet."));
  }, [user]);

  useEffect(() => {
    if (selectedJoy) {
      setCenter({ lat: selectedJoy.lat, lng: selectedJoy.lng });
    }
  }, [selectedJoy?.id]);

  const locateMe = () => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setCenter({ lat: coords.latitude, lng: coords.longitude }),
      () => setError("Location permission is needed to find you."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const closeCluster = () => {
    setClusterPins([]);
    setClusterFocusedPinId(null);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <MapViewer
          pins={displayJoys}
          center={center}
          zoom={15}
          origin={routeOrigin}
          destination={routeDestination}
          waypoints={routeWaypoints}
          activePinId={focusedPinId}
          onPinClick={(pin) => {
            setSelectedJoy(pin as Joy);
            setClusterPins([]);
            setClusterFocusedPinId(pin.id);
            setRouteSummaryOpen(false);
          }}
          onClusterOpen={(pins) => {
            setSelectedJoy(null);
            setClusterPins(pins as Joy[]);
            setClusterFocusedPinId(null);
            setRouteSummaryOpen(false);
          }}
          onMapClick={() => {
            setSelectedJoy(null);
            setRouteSummaryOpen(false);
            closeCluster();
          }}
        />
      </div>

      {clusterPins.length > 0 && (
        <div
          className="cluster-overlay"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 20,
            margin: "0 auto",
            width: "min(600px, calc(100% - 32px))",
            borderRadius: 22,
            background: "rgba(18, 20, 27, 0.95)",
            border: "1px solid rgba(255,255,255,.14)",
            backdropFilter: "blur(20px)",
            zIndex: 20,
          }}
        >
          <div style={{ padding: "14px 16px", display: "flex", alignItems: "center" }}>
            <div
              style={{
                height: 4,
                width: 42,
                borderRadius: 999,
                background: "rgba(255,255,255,.2)",
                marginRight: "auto",
              }}
            />
            <button
              type="button"
              onClick={closeCluster}
              aria-label="Close cluster list"
              className="pressable"
              style={{
                border: 0,
                borderRadius: 999,
                background: "rgba(255,255,255,.12)",
                color: "#fff",
                padding: "6px 12px",
                fontSize: 12,
              }}
            >
              Close
            </button>
          </div>
          <div style={{ maxHeight: "44dvh", overflowY: "auto", padding: "0 16px 14px" }}>
            <p style={{ color: "rgba(255,255,255,.6)", fontSize: 12, marginBottom: 8 }}>Bubble cluster</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {clusterPins.map((pin) => {
                const isFocused = pin.id === clusterFocusedPinId;
                return (
                  <button
                    key={pin.id}
                    type="button"
                    className="pressable"
                    onClick={() => {
                      setSelectedJoy(pin);
                      setClusterFocusedPinId(pin.id);
                      setCenter({ lat: pin.lat, lng: pin.lng });
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      textAlign: "left",
                      borderRadius: 14,
                      border: isFocused ? "1px solid rgba(168, 85, 247, 0.7)" : "1px solid rgba(255,255,255,.12)",
                      padding: 12,
                      background: isFocused ? "rgba(168, 85, 247, 0.16)" : "rgba(255,255,255,.04)",
                    }}
                  >
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        display: "grid",
                        placeItems: "center",
                        background: isFocused ? "rgba(168,85,247,.24)" : "rgba(255,255,255,.08)",
                      }}
                    >
                      {pin.emoji}
                    </span>
                    <div>
                      <p style={{ fontWeight: 700 }}>{pin.title}</p>
                      <p style={{ color: "rgba(255,255,255,.55)", fontSize: 12, marginTop: 2 }}>{pin.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: 20, zIndex: 10, pointerEvents: "none" }}>
            <Link href="/search" style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(18,20,27,.9)", backdropFilter: "blur(20px)", padding: "16px 20px", borderRadius: 20, border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 8px 24px rgba(0,0,0,.4)", textDecoration: "none", color: "rgba(255,255,255,.5)", pointerEvents: "auto" }}>
          <span>🔍</span>
          <span style={{ fontSize: 15, fontWeight: 500, color: originStr && destStr ? "#fff" : "inherit" }}>
            {originStr && destStr ? `${originStr} → ${destStr}` : "Where do you want to go?"}
          </span>
        </Link>
        {(authLoading || error || (!authLoading && joys.length === 0)) && (
          <div style={{ marginTop: 10, padding: "8px 12px", width: "fit-content", borderRadius: 99, background: "rgba(13,12,20,.8)", color: "rgba(255,255,255,.65)", fontSize: 12 }}>
            {authLoading ? "Creating your guest ID…" : error || "No joys here yet — add the first one!"}
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 100, left: 20, right: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", zIndex: 10, pointerEvents: "none" }}>
        <button onClick={locateMe} aria-label="Use my location" className="pressable" style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(18,20,27,.9)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,.1)", color: "#fff", fontSize: 20, boxShadow: "0 8px 24px rgba(0,0,0,.35)", cursor: "pointer", pointerEvents: "auto" }}>
          📍
        </button>
        <Link href="/add" aria-label="Add joy" className="pressable" style={{ width: 64, height: 64, borderRadius: 32, background: "linear-gradient(135deg,rgba(123,110,255,.95),rgba(244,115,177,.95))", color: "#fff", fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 28px rgba(123,110,255,.45)", textDecoration: "none", pointerEvents: "auto" }}>
          ✨
        </Link>
      </div>

      <JoyCard
        pin={selectedJoy}
        waypoints={routeSummaryOpen ? routeWaypoints : []}
        routeStats={routeStats.minutes ? routeStats : undefined}
        onClose={() => (selectedJoy ? setSelectedJoy(null) : setRouteSummaryOpen(false))}
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
