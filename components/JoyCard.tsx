"use client";

import { useState } from "react";
import { Pin } from "@/lib/mockPins";

interface JoyCardProps {
  pin: Pin | null;
  waypoints: Pin[];
  onClose: () => void;
  onShare: (pin: Pin) => void;
}

const S = {
  sheet: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    padding: "0 12px 12px",
  },
  card: {
    borderRadius: 24,
    background: "rgba(13, 12, 20, 0.94)",
    backdropFilter: "blur(28px) saturate(160%)",
    WebkitBackdropFilter: "blur(28px) saturate(160%)",
    border: "1px solid rgba(255,255,255,0.09)",
    boxShadow: "0 -8px 48px rgba(0,0,0,0.7)",
    overflow: "hidden" as const,
    position: "relative" as const,
  },
  closeBtn: {
    position: "absolute" as const,
    top: 14,
    right: 14,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.09)",
    border: "none",
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    cursor: "pointer",
  },
};

function PinPhotoCard({ pin, onShare }: { pin: Pin; onShare: (p: Pin) => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div>
      {/* Photo area */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 200,
          background: "rgba(255,255,255,0.04)",
          overflow: "hidden",
        }}
      >
        {imgError ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 48, opacity: 0.3 }}>{pin.emoji}</span>
          </div>
        ) : (
          <img
            src={pin.imageUrl}
            alt={pin.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={() => setImgError(true)}
          />
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(13,12,20,0.95) 0%, rgba(13,12,20,0.05) 55%, transparent 100%)",
          }}
        />

        {/* Author chip */}
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
            borderRadius: 99,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>@{pin.author}</span>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>· {pin.sharedAt}</span>
        </div>

        {/* Emoji sticker */}
        <div style={{ position: "absolute", bottom: 14, left: 20, fontSize: 36, lineHeight: 1 }}>
          {pin.emoji}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 20px 24px" }}>
        <p
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
            marginBottom: 10,
          }}
        >
          {pin.title}
        </p>
        <p
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          {pin.description}
        </p>

        <button
          id={`share-btn-${pin.id}`}
          onClick={() => onShare(pin)}
          className="pressable"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "10px 18px",
            borderRadius: 99,
            background: "rgba(244,114,182,0.12)",
            border: "1.5px solid rgba(244,114,182,0.3)",
            color: "#f472b6",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <span>📷</span> 나도 공유하기
        </button>
      </div>
    </div>
  );
}

function WaypointRow({ pin, onShare }: { pin: Pin; onShare: (p: Pin) => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
      {/* Thumbnail */}
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 16,
          overflow: "hidden",
          flexShrink: 0,
          background: "rgba(255,255,255,0.06)",
        }}
      >
        {imgError ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              opacity: 0.3,
            }}
          >
            {pin.emoji}
          </div>
        ) : (
          <img
            src={pin.imageUrl}
            alt={pin.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
          <span style={{ fontSize: 16 }}>{pin.emoji}</span>
          <p
            style={{
              color: "#fff",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 14,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {pin.title}
          </p>
        </div>
        <p
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: 12,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
            marginBottom: 7,
          }}
        >
          {pin.description}
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); onShare(pin); }}
          className="pressable"
          style={{
            background: "none",
            border: "none",
            color: "#f472b6",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
          }}
        >
          📷 공유하기
        </button>
      </div>
    </div>
  );
}

export default function JoyCard({ pin, waypoints, onClose, onShare }: JoyCardProps) {
  const showingPin = !!pin;
  const showingRoute = waypoints.length > 0 && !pin;
  if (!showingPin && !showingRoute) return null;

  return (
    <div className="sheet-enter" style={S.sheet}>
      <div style={S.card}>
        <button onClick={onClose} style={S.closeBtn}>✕</button>

        {showingPin && pin && (
          <PinPhotoCard pin={pin} onShare={onShare} />
        )}

        {showingRoute && (
          <div style={{ padding: "24px 20px 24px" }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  color: "#a3e635",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                ✨ Joy Route
              </span>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 99,
                  background: "rgba(163,230,53,0.12)",
                  border: "1px solid rgba(163,230,53,0.2)",
                  color: "#a3e635",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 11,
                }}
              >
                {waypoints.length} stops
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 12,
                }}
              >
                detour included
              </span>
            </div>

            {/* Waypoints */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {waypoints.map((wp, i) => (
                <div key={wp.id}>
                  <WaypointRow pin={wp} onShare={onShare} />
                  {i < waypoints.length - 1 && (
                    <div
                      style={{
                        marginTop: 16,
                        marginLeft: 34,
                        width: 2,
                        height: 14,
                        borderRadius: 99,
                        background: "rgba(139,92,246,0.25)",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              id="start-walking-btn"
              className="btn-joy"
              style={{ width: "100%", height: 52, fontSize: 15, marginTop: 24 }}
            >
              🚶 Start Walking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
