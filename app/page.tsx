"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import JoyCard from "@/components/JoyCard";
import MapViewer from "@/components/MapViewer";
import { JoyGroup, subscribeToGroups } from "@/lib/groups";
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
  const pathname = usePathname();
  const { user } = useAuth();
  const [joys, setJoys] = useState<Joy[]>([]);
  const [groups, setGroups] = useState<JoyGroup[]>([]);
  const [selectedJoy, setSelectedJoy] = useState<Joy | null>(null);
  const [clusterPins, setClusterPins] = useState<Joy[]>([]);
  const [clusterFocusedPinId, setClusterFocusedPinId] = useState<string | null>(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
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
  const groupIds = useMemo(() => groups.map((group) => group.id), [groups]);

  useEffect(() => {
    if (!user) return;
    return subscribeToGroups(user.uid, setGroups, () => setError("Could not load groups yet."));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeToJoys(setJoys, () => setError("Could not load joys yet."), groupIds);
  }, [user, groupIds]);

  const locateMe = () => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCenter({ lat: coords.latitude, lng: coords.longitude });
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
            pointerEvents: "auto",
          }}
        >
          <Link
            href="/search"
            aria-label="Search joy routes"
            className="pressable"
            style={{
              flex: 1,
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
            }}
          >
            <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 17 }}>🔍</span> Search joy routes
            </span>
            <span style={{ fontSize: 12, opacity: 0.55 }}>Tap</span>
          </Link>

          <Link
            href="/explore"
            aria-label="탐색"
            className="pressable"
            style={{
              width: 52,
              height: 52,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(139, 92, 246, 0.25)",
              border: "1px solid rgba(255,255,255,.22)",
              color: "#fff",
              textDecoration: "none",
              gap: 0,
              boxShadow: "0 10px 24px rgba(0,0,0,.28)",
            }}
          >
            <span style={{ fontSize: 22, flexShrink: 0 }}>🗺️</span>
          </Link>

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
            }}
          >
            <span style={{ fontSize: 22, flexShrink: 0 }}>⋮</span>
          </Link>
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
          onPinClick={(pin) => {
            setSelectedJoy(pin as Joy);
            setClusterPins([]);
            setClusterFocusedPinId(pin.id);
            setCenter({ lat: pin.lat, lng: pin.lng });
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
            bottom: "calc(var(--app-map-floating-offset))",
            margin: "0 auto",
            width: "min(600px, calc(100% - 32px))",
            borderRadius: 22,
            background: "rgba(18, 20, 27, 0.95)",
            border: "1px solid rgba(255,255,255,.14)",
            backdropFilter: "blur(20px)",
            zIndex: 60,
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
