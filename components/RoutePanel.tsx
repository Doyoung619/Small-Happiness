"use client";

import { useRef, useState } from "react";
import { Autocomplete } from "@react-google-maps/api";

interface RoutePanelProps {
  onRoute: (origin: string, destination: string) => void;
  isLoading: boolean;
  isMapLoaded: boolean;
  routeSummary: { distance: string; duration: string; detours: number } | null;
}

export default function RoutePanel({ onRoute, isLoading, isMapLoaded, routeSummary }: RoutePanelProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const originRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;
    onRoute(origin, destination);
  };

  if (!isMapLoaded) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 52,
              borderRadius: 14,
              background: "rgba(255,255,255,0.05)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Origin input */}
        <div style={{ position: "relative" }}>
          <Autocomplete
            onLoad={(ac) => (originRef.current = ac)}
            onPlaceChanged={() => {
              const place = originRef.current?.getPlace();
              if (place?.formatted_address) setOrigin(place.formatted_address);
              else if (place?.name) setOrigin(place.name);
            }}
          >
            <input
              id="origin-input"
              type="text"
              placeholder="어디서 출발할까요?"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px 14px 72px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.07)",
                border: "1.5px solid rgba(255,255,255,0.10)",
                color: "#fff",
                fontSize: 14,
                fontFamily: "var(--font-body)",
                outline: "none",
                caretColor: "#8b5cf6",
                transition: "border-color 150ms, background 150ms",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(139,92,246,0.6)";
                e.target.style.background = "rgba(139,92,246,0.08)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.10)";
                e.target.style.background = "rgba(255,255,255,0.07)";
              }}
            />
          </Autocomplete>
          <span
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 11,
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              color: "#a3e635",
              letterSpacing: "0.05em",
              pointerEvents: "none",
            }}
          >
            FROM
          </span>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>↓</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
        </div>

        {/* Destination input */}
        <div style={{ position: "relative" }}>
          <Autocomplete
            onLoad={(ac) => (destRef.current = ac)}
            onPlaceChanged={() => {
              const place = destRef.current?.getPlace();
              if (place?.formatted_address) setDestination(place.formatted_address);
              else if (place?.name) setDestination(place.name);
            }}
          >
            <input
              id="destination-input"
              type="text"
              placeholder="어디로 갈까요?"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px 14px 52px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.07)",
                border: "1.5px solid rgba(255,255,255,0.10)",
                color: "#fff",
                fontSize: 14,
                fontFamily: "var(--font-body)",
                outline: "none",
                caretColor: "#f472b6",
                transition: "border-color 150ms, background 150ms",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(244,114,182,0.6)";
                e.target.style.background = "rgba(244,114,182,0.06)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.10)";
                e.target.style.background = "rgba(255,255,255,0.07)";
              }}
            />
          </Autocomplete>
          <span
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 11,
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              color: "#f472b6",
              letterSpacing: "0.05em",
              pointerEvents: "none",
            }}
          >
            TO
          </span>
        </div>

        {/* CTA button */}
        <button
          id="find-route-btn"
          type="submit"
          disabled={isLoading || !origin || !destination}
          className="btn-joy"
          style={{ width: "100%", height: 52, fontSize: 15, marginTop: 4 }}
        >
          {isLoading ? (
            <>
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  display: "inline-block",
                  animation: "spin 0.7s linear infinite",
                  flexShrink: 0,
                }}
              />
              <span style={{ marginLeft: 8 }}>Joy spot 찾는 중…</span>
            </>
          ) : (
            <>✨ Joy Route 찾기</>
          )}
        </button>
      </form>

      {/* Route stats */}
      {routeSummary && (
        <div
          style={{
            display: "flex",
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid rgba(139,92,246,0.2)",
            background: "rgba(139,92,246,0.06)",
            marginTop: 2,
          }}
        >
          {[
            { label: "거리", value: routeSummary.distance, color: "#38bdf8" },
            { label: "도보 시간", value: routeSummary.duration, color: "#f472b6" },
            { label: "Joy Spot", value: `${routeSummary.detours} ✨`, color: "#a3e635" },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "14px 8px",
                borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              <span
                style={{
                  color: stat.color,
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 15,
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 11,
                  marginTop: 5,
                  fontFamily: "var(--font-body)",
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
