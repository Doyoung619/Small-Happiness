"use client";

/* eslint-disable react-hooks/refs */

import { useCallback, useRef, useState, useEffect } from "react";
import { GoogleMap, useJsApiLoader, OverlayView, DirectionsRenderer } from "@react-google-maps/api";
import BubblePin from "./BubblePin";
import { Pin } from "@/lib/mockPins";
import { clusterPins } from "@/lib/clustering";
import { GeoPoint } from "@/lib/routeOptimization";
import { useRuntimeConfig } from "@/components/RuntimeProviders";

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
  onCenterChanged?: (center: { lat: number; lng: number }) => void;
  userLocation?: { lat: number; lng: number } | null;
}

const containerStyle = {
  width: "100%",
  height: "100%",
};

// Light mode map style (day theme)
const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  gestureHandling: "greedy" as const,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#f5f6f9" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#4b5563" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
    { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#d1d5db" }] },
    { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
    { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
    { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
    { featureType: "poi", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
    { featureType: "poi.business", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dde7d8" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6d8f65" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#f1f3f7" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#d5d9e0" }] },
    { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#d4d8df" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#4b5563" }] },
    { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
    { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#cfd4da" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#dbe9f4" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4b5563" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
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
  onCenterChanged,
  userLocation,
}: MapViewerProps) {
  const { googleMapsApiKey } = useRuntimeConfig();
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey,
    libraries,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [burstingPinId, setBurstingPinId] = useState<string | null>(null);
  const [mapMoving, setMapMoving] = useState(false);

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
    if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
  }, []);

  useEffect(() => {
    if (!activePinId) return;
    const selectedPin = pins.find((pin) => pin.id === activePinId);
    if (!selectedPin) return;
    mapRef.current?.panTo({ lat: selectedPin.lat, lng: selectedPin.lng });
  }, [activePinId, pins]);

  const clusters = clusterPins(pins, currentZoom);

  const zoomChanged = useCallback(() => {
    setMapMoving(true);
    setCurrentZoom(mapRef.current?.getZoom() ?? zoom);
  }, [zoom]);

  const mapIdle = useCallback(() => {
    setMapMoving(false);
    const mapCenter = mapRef.current?.getCenter();
    if (mapCenter) onCenterChanged?.({ lat: mapCenter.lat(), lng: mapCenter.lng() });
  }, [onCenterChanged]);

  const openCluster = useCallback((cluster: { lat: number; lng: number; pins: Pin[] }) => {
    mapRef.current?.panTo({ lat: cluster.lat, lng: cluster.lng });
    mapRef.current?.setZoom(Math.min(currentZoom + 2, 20));
    onClusterOpen?.(cluster.pins);
  }, [currentZoom, onClusterOpen]);

  const openPin = useCallback((pin: Pin) => {
    if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    const open = () => {
      setBurstingPinId(null);
      onPinClick?.(pin);
      mapRef.current?.panTo({ lat: pin.lat, lng: pin.lng });
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return open();
    setBurstingPinId(pin.id);
    burstTimerRef.current = setTimeout(open, 220);
  }, [onPinClick]);

  if (!isLoaded) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", color: "rgba(17,24,39,0.62)" }}>
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
      onZoomChanged={zoomChanged}
      onDragStart={() => setMapMoving(true)}
      onIdle={mapIdle}
      options={mapOptions}
    >
      {userLocation && (
        <OverlayView position={userLocation} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
          <div className="user-location-marker" role="img" aria-label="Your location"><span /></div>
        </OverlayView>
      )}

      {clusters.map((cluster, index) => (
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
                openCluster(cluster);
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
                  openPin(pin);
                }}
                className="map-bubble-button"
                style={{ position: "absolute", transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer", pointerEvents: "auto", border: 0, padding: 0, background: "none", color: "#111827" }}
              >
                <BubblePin emoji={pin.emoji} hue={pin.hue} selected={activePinId === pin.id} bursting={burstingPinId === pin.id} floatDelay={-(index % 7) * 0.35} floatPaused={mapMoving} />
                {pin.label && <span style={{ fontSize: "11px", fontWeight: 600, color: "#111827", pointerEvents: "none", whiteSpace: "nowrap" }}>{pin.label}</span>}
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
              strokeColor: "#4f46e5",
              strokeWeight: 6,
              strokeOpacity: 0.95,
            },
            suppressMarkers: false, // Keep default A/B markers for now, or we can suppress and use our BubblePins
          }}
        />
      )}
    </GoogleMap>
  );
}
