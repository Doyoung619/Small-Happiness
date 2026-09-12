"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Pin } from "@/lib/mockPins";
import { detectEmojis, SuggestedEmoji } from "@/lib/autoEmoji";

interface ShareAtLocationModalProps {
  location: { lat: number; lng: number } | null;
  onClose: () => void;
  onSubmit: (pin: Omit<Pin, "id">) => void;
}

type Step = "source" | "webcam" | "compose";
const MAX_CHARS = 100;

// ── Webcam capture overlay ──────────────────────────────────────────
function WebcamCapture({
  onCapture,
  onCancel,
}: {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [flash, setFlash] = useState(false);

  const startStream = useCallback(async (facing: "user" | "environment") => {
    // Stop any existing stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setReady(true);
        };
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("카메라 권한이 필요해요. 브라우저에서 카메라 접근을 허용해주세요.");
        } else if (err.name === "NotFoundError") {
          setError("카메라를 찾을 수 없어요.");
        } else {
          setError("카메라를 열 수 없어요: " + err.message);
        }
      }
    }
  }, []);

  useEffect(() => {
    startStream(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, startStream]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !ready) return;

    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror if front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(dataUrl);
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "#000",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Video */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {error ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              padding: 32,
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 48 }}>📷</span>
            <p style={{ color: "#f472b6", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>
              {error}
            </p>
            <button
              onClick={onCancel}
              style={{
                padding: "12px 28px",
                borderRadius: 99,
                background: "rgba(255,255,255,0.1)",
                border: "1.5px solid rgba(255,255,255,0.2)",
                color: "#fff",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              돌아가기
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: facingMode === "user" ? "scaleX(-1)" : "none",
                transition: "opacity 200ms",
                opacity: ready ? 1 : 0,
              }}
            />

            {/* Loading overlay */}
            {!ready && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#111",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    border: "3px solid rgba(139,92,246,0.2)",
                    borderTopColor: "#8b5cf6",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
              </div>
            )}

            {/* Flash overlay */}
            {flash && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#fff",
                  opacity: 0.6,
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Viewfinder corners */}
            {ready && (
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                {[
                  { top: 40, left: 40 },
                  { top: 40, right: 40 },
                  { bottom: 40, left: 40 },
                  { bottom: 40, right: 40 },
                ].map((pos, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      ...pos,
                      width: 28,
                      height: 28,
                      borderColor: "rgba(255,255,255,0.6)",
                      borderStyle: "solid",
                      borderWidth: 0,
                      ...(i === 0 && { borderTopWidth: 2, borderLeftWidth: 2, borderRadius: "4px 0 0 0" }),
                      ...(i === 1 && { borderTopWidth: 2, borderRightWidth: 2, borderRadius: "0 4px 0 0" }),
                      ...(i === 2 && { borderBottomWidth: 2, borderLeftWidth: 2, borderRadius: "0 0 0 4px" }),
                      ...(i === 3 && { borderBottomWidth: 2, borderRightWidth: 2, borderRadius: "0 0 4px 0" }),
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls bar */}
      {!error && (
        <div
          style={{
            padding: "28px 40px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Cancel */}
          <button
            onClick={onCancel}
            className="pressable"
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.1)",
              border: "1.5px solid rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>

          {/* Shutter button */}
          <button
            onClick={handleCapture}
            disabled={!ready}
            className="pressable"
            style={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: ready ? "#fff" : "rgba(255,255,255,0.3)",
              border: "5px solid rgba(255,255,255,0.3)",
              cursor: ready ? "pointer" : "not-allowed",
              transition: "transform 80ms ease",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: ready ? "#fff" : "rgba(255,255,255,0.5)",
                border: "2px solid rgba(0,0,0,0.15)",
              }}
            />
          </button>

          {/* Flip camera */}
          <button
            onClick={toggleCamera}
            className="pressable"
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.1)",
              border: "1.5px solid rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            🔄
          </button>
        </div>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

// ── Main modal ──────────────────────────────────────────────────────
export default function ShareAtLocationModal({ location, onClose, onSubmit }: ShareAtLocationModalProps) {
  const [step, setStep] = useState<Step>("source");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [suggestedEmojis, setSuggestedEmojis] = useState<SuggestedEmoji[]>([]);
  const [selectedEmoji, setSelectedEmoji] = useState<string>("📍");
  const [isDragging, setIsDragging] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const suggestions = detectEmojis(text);
    setSuggestedEmojis(suggestions);
    if (suggestions.length > 0 && selectedEmoji === "📍") {
      setSelectedEmoji(suggestions[0].emoji);
    }
  }, [text]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      setStep("compose");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!text.trim() || !location) return;
    const newPin: Omit<Pin, "id"> = {
      lat: location.lat,
      lng: location.lng,
      title: text.slice(0, 30) + (text.length > 30 ? "…" : ""),
      description: text,
      emoji: selectedEmoji,
      imageUrl: imagePreview ?? `https://picsum.photos/seed/${Date.now()}/600/400`,
      author: "me",
      sharedAt: "방금",
    };
    onSubmit(newPin);
    onClose();
  };

  const remaining = MAX_CHARS - text.length;

  // Webcam overlay — rendered outside the sheet so it's truly fullscreen
  if (step === "webcam") {
    return (
      <WebcamCapture
        onCapture={(dataUrl) => {
          setImagePreview(dataUrl);
          setStep("compose");
        }}
        onCancel={() => setStep("source")}
      />
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(6px)",
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="sheet-enter"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 520,
          margin: "0 12px 12px",
          borderRadius: 28,
          background: "rgba(13, 12, 20, 0.97)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 -12px 60px rgba(0,0,0,0.8)",
          overflow: "hidden",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 14, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.12)" }} />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 20px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {step === "compose" && (
            <button
              onClick={() => { setStep("source"); setImagePreview(null); }}
              className="pressable"
              style={{
                width: 30, height: 30, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.08)", border: "none",
                color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer", flexShrink: 0,
              }}
            >
              ←
            </button>
          )}
          <div style={{ flex: 1 }}>
            <p style={{ color: "#fff", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
              {step === "source" ? "여기서 소확행 공유하기 📍" : "어떤 순간이었나요?"}
            </p>
            {location && (
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="pressable"
            style={{
              width: 30, height: 30, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.08)", border: "none",
              color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Step 1: Source picker ── */}
        {step === "source" && (
          <div style={{ padding: "24px 20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, textAlign: "center", fontFamily: "var(--font-body)" }}>
              이 순간을 어떻게 담을까요?
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Webcam / Camera */}
              <button
                id="camera-btn"
                onClick={() => setStep("webcam")}
                className="pressable"
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                  padding: "28px 16px", borderRadius: 20, cursor: "pointer",
                  background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(244,114,182,0.10))",
                  border: "1.5px solid rgba(139,92,246,0.25)",
                }}
              >
                <span style={{ fontSize: 36 }}>📸</span>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: "#fff", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    사진 찍기
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>웹캠 열기</p>
                </div>
              </button>

              {/* Gallery */}
              <button
                id="gallery-btn"
                onClick={() => galleryInputRef.current?.click()}
                className="pressable"
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                  padding: "28px 16px", borderRadius: 20, cursor: "pointer",
                  background: "linear-gradient(135deg, rgba(56,189,248,0.12), rgba(163,230,53,0.08))",
                  border: "1.5px solid rgba(56,189,248,0.2)",
                }}
              >
                <span style={{ fontSize: 36 }}>🖼️</span>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: "#fff", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    앨범에서 선택
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>갤러리 열기</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setStep("compose")}
              className="pressable"
              style={{
                background: "none", border: "none",
                color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)",
                fontSize: 13, cursor: "pointer", padding: "4px 0", textAlign: "center",
              }}
            >
              사진 없이 글만 올리기 →
            </button>
          </div>
        )}

        {/* ── Step 2: Compose ── */}
        {step === "compose" && (
          <div style={{ padding: "20px 20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Image preview / drop zone */}
            <label
              htmlFor="compose-photo-upload"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              style={{
                display: "block", borderRadius: 18, overflow: "hidden", cursor: "pointer",
                border: `2px dashed ${isDragging ? "#8b5cf6" : imagePreview ? "transparent" : "rgba(255,255,255,0.10)"}`,
                background: imagePreview ? "transparent" : "rgba(255,255,255,0.04)",
                height: 160, position: "relative", transition: "border-color 150ms",
              }}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {/* Re-take with webcam button */}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStep("webcam"); setImagePreview(null); }}
                    className="pressable"
                    style={{
                      position: "absolute", bottom: 10, right: 10,
                      padding: "6px 12px", borderRadius: 99,
                      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#fff", fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    📸 다시 찍기
                  </button>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, background: "rgba(139,92,246,0.15)", border: "1.5px solid rgba(139,92,246,0.25)" }}>
                    📷
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 500 }}>
                    사진 추가 (선택)
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>드래그 또는 클릭</p>
                </div>
              )}
              <input id="compose-photo-upload" type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </label>

            {/* Textarea */}
            <div style={{ position: "relative" }}>
              <textarea
                placeholder="이 순간의 소확행을 짧게 남겨주세요…"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                rows={3}
                autoFocus
                style={{
                  width: "100%", padding: "14px 16px 36px", borderRadius: 14,
                  background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.10)",
                  color: "#fff", fontSize: 14, fontFamily: "var(--font-body)",
                  outline: "none", resize: "none", lineHeight: 1.6,
                  caretColor: "#8b5cf6", boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(139,92,246,0.6)"; e.target.style.background = "rgba(139,92,246,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.10)"; e.target.style.background = "rgba(255,255,255,0.07)"; }}
              />
              <span
                style={{
                  position: "absolute", bottom: 12, right: 14,
                  fontSize: 12, fontWeight: 700, fontFamily: "var(--font-display)",
                  color: remaining <= 15 ? (remaining <= 0 ? "#f87171" : "#fb923c") : "rgba(255,255,255,0.25)",
                  transition: "color 150ms", pointerEvents: "none",
                }}
              >
                {remaining}
              </span>
            </div>

            {/* Emoji suggestions */}
            <div>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginBottom: 10, fontFamily: "var(--font-body)" }}>
                {suggestedEmojis.length > 0 ? "✨ 자동 감지된 이모지" : "이모지 선택"}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {suggestedEmojis.map((s) => (
                  <button
                    key={s.emoji}
                    onClick={() => setSelectedEmoji(s.emoji)}
                    className="pressable"
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", borderRadius: 99,
                      background: selectedEmoji === s.emoji ? "linear-gradient(135deg, #8b5cf6, #f472b6)" : "rgba(139,92,246,0.12)",
                      border: selectedEmoji === s.emoji ? "1.5px solid transparent" : "1.5px solid rgba(139,92,246,0.3)",
                      color: selectedEmoji === s.emoji ? "#fff" : "rgba(255,255,255,0.7)",
                      fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, cursor: "pointer",
                      transition: "all 150ms ease",
                    }}
                  >
                    <span>{s.emoji}</span>
                    <span style={{ fontSize: 11 }}>{s.label}</span>
                  </button>
                ))}
                {["📍", "✨", "💜", "😊"].map((e) => (
                  <button
                    key={e}
                    onClick={() => setSelectedEmoji(e)}
                    className="pressable"
                    style={{
                      width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: "50%", fontSize: 18, cursor: "pointer",
                      background: selectedEmoji === e ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.06)",
                      border: selectedEmoji === e ? "1.5px solid rgba(139,92,246,0.6)" : "1.5px solid rgba(255,255,255,0.08)",
                      transition: "all 150ms ease",
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              id="share-location-submit-btn"
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="btn-joy"
              style={{ width: "100%", height: 52, fontSize: 15, marginTop: 4 }}
            >
              {selectedEmoji} 지금 여기 공유하기
            </button>
          </div>
        )}

        {/* Hidden gallery input */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
    </div>
  );
}
