"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { GoogleMap, useJsApiLoader, OverlayView, DirectionsRenderer } from "@react-google-maps/api";
import BubblePin from "./BubblePin";
import { Pin } from "@/lib/mockPins";
import { clusterPins } from "@/lib/clustering";
import { GeoPoint } from "@/lib/routeOptimization";

const libraries: ("places")[] = ["places"];

interface MapViewerProps {
  pins: Pin[];
  center?: { lat: number; lng: number };
  zoom?: number;
  origin?: string | GeoPoint | null;
  destination?: string | GeoPoint | null;
  waypoints?: Pin[];
  onPinClick?: (pin: Pin) => void;
  onMapClick?: () => void;
  activePinId?: string | null;
  onClusterOpen?: (pins: Pin[]) => void;
}

const containerStyle = {
  width: "100%",
  height: "100%",
};

// GenZ Dark Mode Map Style
const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  gestureHandling: "greedy" as const,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#1a1b26" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
  ],
};

export default function MapViewer({
  pins,
  center = { lat: 40.4433, lng: -79.9436 },
  zoom = 14,
  origin,
  destination,
  waypoints = [],
  onPinClick,
  onMapClick,
  activePinId = null,
  onClusterOpen,
}: MapViewerProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  useEffect(() => {
    if (isLoaded && origin && destination) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode.WALKING,
          waypoints: waypoints.map((pin) => ({ location: { lat: pin.lat, lng: pin.lng }, stopover: true })),
          optimizeWaypoints: false,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            setDirections(result);
          } else {
            console.error("Error fetching directions", status);
          }
        }
      );
    }
  }, [isLoaded, origin, destination, waypoints]);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    mapRef.current = map;
    setCurrentZoom(map.getZoom() ?? zoom);
  }, [zoom]);

  const onUnmount = useCallback(function callback() {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    if (!activePinId) return;
    const selectedPin = pins.find((pin) => pin.id === activePinId);
    if (!selectedPin) return;
    mapRef.current?.panTo({ lat: selectedPin.lat, lng: selectedPin.lng });
  }, [activePinId, pins]);

  const clusters = clusterPins(pins, currentZoom);

  if (!isLoaded) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1b26", color: "rgba(255,255,255,0.5)" }}>
        Loading Map...
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={onMapClick}
      onZoomChanged={() => setCurrentZoom(mapRef.current?.getZoom() ?? zoom)}
      options={mapOptions}
    >
      {clusters.map((cluster) => (
        <OverlayView
          key={cluster.id}
          position={{ lat: cluster.lat, lng: cluster.lng }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          {cluster.pins.length > 1 ? (
            <button
              type="button"
              aria-label={`Zoom into ${cluster.pins.length} joys`}
              onClick={(event) => {
                event.stopPropagation();
                mapRef.current?.panTo({ lat: cluster.lat, lng: cluster.lng });
                mapRef.current?.setZoom(Math.min(currentZoom + 2, 20));
                onClusterOpen?.(cluster.pins);
              }}
              className="joy-cluster pressable"
            >
              <strong>{cluster.pins.length}</strong><span>joys</span>
            </button>
          ) : (() => {
            const pin = cluster.pins[0];
            return (
              <button
                type="button"
                aria-label={pin.label ? `${pin.label} details` : "Joy details"}
                onClick={(event) => {
                  event.stopPropagation();
                  onPinClick?.(pin);
                  mapRef.current?.panTo({ lat: pin.lat, lng: pin.lng });
                }}
                className="pressable"
                style={{ position: "absolute", transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer", pointerEvents: "auto", border: 0, padding: 0, background: "none", color: "inherit" }}
              >
                <BubblePin emoji={pin.emoji} hue={pin.hue} selected={activePinId === pin.id} />
                {pin.label && <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.8)", textShadow: "0 2px 4px rgba(0,0,0,0.8)", pointerEvents: "none", whiteSpace: "nowrap" }}>{pin.label}</span>}
              </button>
            );
          })()}
        </OverlayView>
      ))}

      {directions && origin && destination && (
        <DirectionsRenderer
          directions={directions}
          options={{
            polylineOptions: {
              strokeColor: "#f472b6", // Gen Z glowing pink
              strokeWeight: 6,
              strokeOpacity: 0.8,
            },
            suppressMarkers: false, // Keep default A/B markers for now, or we can suppress and use our BubblePins
          }}
        />
      )}
    </GoogleMap>
  );
}
