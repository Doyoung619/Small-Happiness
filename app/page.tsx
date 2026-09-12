"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { useLoadScript } from "@react-google-maps/api";
import RoutePanel from "@/components/RoutePanel";
import JoyCard from "@/components/JoyCard";
import ShareModal from "@/components/ShareModal";
import ShareAtLocationModal from "@/components/ShareAtLocationModal";
import { Pin, MOCK_PINS } from "@/lib/mockPins";
import {
  getBoundingBox,
  filterPinsInBox,
  pickWaypoints,
  buildDirectionsRequest,
} from "@/lib/routing";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });
const LIBRARIES: ("places")[] = ["places"];

export default function HomePage() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
  });

  const [pins, setPins] = useState<Pin[]>(MOCK_PINS);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [activeWaypoints, setActiveWaypoints] = useState<Pin[]>([]);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [routeSummary, setRouteSummary] = useState<{
    distance: string; duration: string; detours: number;
  } | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [sharePin, setSharePin] = useState<Pin | null>(null);
  const [shareAtLocation, setShareAtLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleRoute = useCallback(async (origin: string, destination: string) => {
    if (!isLoaded) return;
    setIsLoading(true);
    setSelectedPin(null);
    try {
      const geocoder = new google.maps.Geocoder();
      const [oResult, dResult] = await Promise.all([
        geocoder.geocode({ address: origin }),
        geocoder.geocode({ address: destination }),
      ]);
      const oLoc = oResult.results[0]?.geometry.location;
      const dLoc = dResult.results[0]?.geometry.location;
      if (!oLoc || !dLoc) throw new Error("Could not geocode.");
      const oLatLng = { lat: oLoc.lat(), lng: oLoc.lng() };
      const dLatLng = { lat: dLoc.lat(), lng: dLoc.lng() };
      const bbox = getBoundingBox(oLatLng, dLatLng, 0.4);
      const filtered = filterPinsInBox(pins, bbox);
      const chosen = pickWaypoints(filtered, 2);
      const request = buildDirectionsRequest(origin, destination, chosen);
      const service = new google.maps.DirectionsService();
      const result = await service.route(request);
      setDirections(result);
      setActiveWaypoints(chosen);
      const leg = result.routes[0]?.legs[0];
      setRouteSummary({
        distance: leg?.distance?.text ?? "—",
        duration: leg?.duration?.text ?? "—",
        detours: chosen.length,
      });
      setShowPanel(true);
    } catch (err) {
      console.error(err);
      alert("Route failed. Try Pittsburgh addresses.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, pins]);

  const handlePinClick = useCallback((pin: Pin) => {
    setSelectedPin((prev) => (prev?.id === pin.id ? null : pin));
    setShowPanel(false);
  }, []);

  const handleCardClose = useCallback(() => {
    setSelectedPin(null);
    setShowPanel(false);
  }, []);

  const handleShare = useCallback((pin: Pin) => setSharePin(pin), []);

  const handleShareSubmit = useCallback(
    (_pinId: string, text: string, _img: string | null) => {
      alert(`공유 완료 ✨\n"${text}"`);
    }, []
  );

  // Share at current location → add new pin immediately to map
  const handleShareAtLocationSubmit = useCallback((pinData: Omit<Pin, "id">) => {
    const newPin: Pin = { ...pinData, id: `user-${Date.now()}` };
    setPins((prev) => [...prev, newPin]);
    setSelectedPin(newPin);
  }, []);

  const activePinIds = new Set(activeWaypoints.map((p) => p.id));

  return (
    <main className="relative w-screen h-screen overflow-hidden" style={{ background: "#0d0d12" }}>
      <MapView
        waypoints={activeWaypoints}
        directions={directions}
        onPinClick={handlePinClick}
        activePinIds={activePinIds}
        onShareAtLocation={setShareAtLocation}
        pins={pins}
      />

      {/* Top panel */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div
          className="pointer-events-auto"
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 20px 12px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              className="pressable"
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                background: "linear-gradient(135deg, #8b5cf6, #f472b6)",
                boxShadow: "0 4px 16px rgba(139,92,246,0.5)",
                flexShrink: 0,
              }}
            >
              🗺️
            </div>
            <div>
              <h1
                className="text-white"
                style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.03em", lineHeight: 1 }}
              >
                JoyWalk
              </h1>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 3 }}>
                micro-happiness map
              </p>
            </div>
          </div>

          <div style={{ marginLeft: "auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 99,
                background: "rgba(163,230,53,0.12)",
                border: "1px solid rgba(163,230,53,0.25)",
              }}
            >
              <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#a3e635", display: "block" }} />
              <span style={{ color: "#a3e635", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-display)" }}>
                {pins.length} spots live
              </span>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto" style={{ margin: "0 16px" }}>
          <div
            className="glass-card joy-gradient"
            style={{ borderRadius: 20, padding: 20 }}
          >
            <RoutePanel
              onRoute={handleRoute}
              isLoading={isLoading}
              isMapLoaded={isLoaded}
              routeSummary={routeSummary}
            />
          </div>
        </div>
      </div>

      <JoyCard
        pin={selectedPin}
        waypoints={showPanel ? activeWaypoints : []}
        onClose={handleCardClose}
        onShare={handleShare}
      />

      {sharePin && (
        <ShareModal
          pin={sharePin}
          onClose={() => setSharePin(null)}
          onSubmit={handleShareSubmit}
        />
      )}

      {shareAtLocation && (
        <ShareAtLocationModal
          location={shareAtLocation}
          onClose={() => setShareAtLocation(null)}
          onSubmit={handleShareAtLocationSubmit}
        />
      )}
    </main>
  );
}
