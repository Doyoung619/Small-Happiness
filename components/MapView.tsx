"use client";

import { useCallback, useState, useRef } from "react";
import {
  GoogleMap,
  useLoadScript,
  DirectionsRenderer,
  OverlayView,
} from "@react-google-maps/api";
import { Pin, MOCK_PINS } from "@/lib/mockPins";

// Must be at module level to avoid MapView reload performance warning
const LIBRARIES: ("places")[] = ["places"];

interface MapViewProps {
  pins: Pin[];
  waypoints: Pin[];
  directions: google.maps.DirectionsResult | null;
  onPinClick: (pin: Pin) => void;
  activePinIds: Set<string>;
  onShareAtLocation: (loc: { lat: number; lng: number }) => void;
  onLocationChange?: (loc: { lat: number; lng: number } | null) => void;
}

const MAP_ID = "joywalk-map";

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa5b4" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#16213e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0f3460" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a9bb0" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#0f3460" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#533483" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f3460" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#16213e" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6b7a8d" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0d2137" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#16213e" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#533483" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
];

const ROUTE_OPTIONS = {
  suppressMarkers: true,
  polylineOptions: {
    strokeColor: "#f59e0b",
    strokeWeight: 5,
    strokeOpacity: 0.9,
  },
};

export default function MapView({
  pins,
  waypoints,
  directions,
  onPinClick,
  activePinIds,
  onShareAtLocation,
  onLocationChange,
}: MapViewProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);

  const setAndNotifyLocation = useCallback((loc: google.maps.LatLngLiteral | null) => {
    setUserLocation(loc);
    onLocationChange?.(loc);
  }, [onLocationChange]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleFindMe = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setAndNotifyLocation(loc);
        mapRef.current?.panTo(loc);
        mapRef.current?.setZoom(15);
      },
      () => alert("Unable to get your location.")
    );
  }, [setAndNotifyLocation]);

  if (loadError) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0d0d12", color: "#f472b6", fontFamily: "var(--font-display)" }}>
      Map failed to load. Check your API key.
    </div>
  );

  if (!isLoaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0d0d12" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid rgba(139,92,246,0.2)", borderTopColor: "#8b5cf6", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#8b5cf6", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px" }}>Loading map…</p>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={{ lat: 40.4444, lng: -79.9461 }}
        zoom={14}
        options={{ styles: DARK_STYLE, disableDefaultUI: true, clickableIcons: false }}
        onLoad={onMapLoad}
      >
        {/* All pins (mock + user-created) */}
        {pins.map((pin) => {
          const isActive = activePinIds.has(pin.id);
          return (
            <OverlayView
              key={pin.id}
              position={{ lat: pin.lat, lng: pin.lng }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <button
                onClick={() => onPinClick(pin)}
                title={pin.title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  cursor: "pointer",
                  border: "none",
                  transition: "transform 80ms ease, box-shadow 200ms ease",
                  width: isActive ? 52 : 44,
                  height: isActive ? 52 : 44,
                  fontSize: isActive ? "24px" : "20px",
                  background: isActive
                    ? "linear-gradient(135deg, #8b5cf6, #f472b6)"
                    : "rgba(255,255,255,0.10)",
                  backdropFilter: "blur(8px)",
                  boxShadow: isActive
                    ? "0 0 0 3px rgba(139,92,246,0.4), 0 8px 24px rgba(139,92,246,0.6)"
                    : "0 4px 16px rgba(0,0,0,0.4)",
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                }}
              >
                {pin.emoji}
              </button>
            </OverlayView>
          );
        })}

        {/* User location dot */}
        {userLocation && (
          <OverlayView
            position={userLocation}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="relative flex items-center justify-center">
              <div className="w-4 h-4 bg-blue-400 rounded-full border-2 border-white shadow-lg z-10" />
              <div className="absolute w-10 h-10 bg-blue-400/30 rounded-full animate-ping" />
            </div>
          </OverlayView>
        )}

        {/* Directions route */}
        {directions && (
          <DirectionsRenderer directions={directions} options={ROUTE_OPTIONS} />
        )}
      </GoogleMap>

      {/* Share Here FAB */}
      {userLocation && (
        <button
          id="share-here-btn"
          onClick={() => onShareAtLocation(userLocation)}
          style={{
            position: "absolute",
            bottom: "76px",
            right: "16px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 18px",
            borderRadius: "99px",
            background: "linear-gradient(135deg, #8b5cf6, #f472b6)",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(139,92,246,0.55)",
            border: "none",
            transition: "transform 80ms ease",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <span>✨</span> 여기 공유
        </button>
      )}

      {/* Find Me Button */}
      <button
        id="find-me-btn"
        onClick={handleFindMe}
        style={{
          position: "absolute",
          bottom: "24px",
          right: "16px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "10px 18px",
          borderRadius: "99px",
          background: "rgba(15,14,22,0.85)",
          backdropFilter: "blur(16px)",
          border: "1.5px solid rgba(139,92,246,0.35)",
          color: "#fff",
          fontSize: "13px",
          fontWeight: 700,
          fontFamily: "var(--font-display)",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          transition: "transform 80ms ease",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <span>📍</span> Find Me
      </button>
    </div>
  );
}
