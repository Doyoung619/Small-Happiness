"use client";

import { useState } from "react";
import { Pin } from "@/lib/mockPins";

interface ShareModalProps {
  pin: Pin;
  onClose: () => void;
  onSubmit: (pinId: string, text: string, imagePreview: string | null) => void;
}

const MAX_CHARS = 100;

export default function ShareModal({ pin, onClose, onSubmit }: ShareModalProps) {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(pin.id, text, imagePreview);
    onClose();
  };

  const remaining = MAX_CHARS - text.length;

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
          background: "rgba(0,0,0,0.72)",
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
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
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
          <span style={{ fontSize: 24 }}>{pin.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                color: "#fff",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 14,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginBottom: 3,
              }}
            >
              {pin.title}
            </p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>나의 소확행 공유하기</p>
          </div>
          <button
            onClick={onClose}
            className="pressable"
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Upload area */}
          <label
            htmlFor="photo-upload"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            style={{
              display: "block",
              borderRadius: 18,
              overflow: "hidden",
              border: `2px dashed ${isDragging ? "#8b5cf6" : imagePreview ? "transparent" : "rgba(255,255,255,0.10)"}`,
              background: imagePreview ? "transparent" : "rgba(255,255,255,0.04)",
              height: 160,
              position: "relative",
              cursor: "pointer",
              transition: "border-color 150ms",
            }}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    background: "rgba(139,92,246,0.15)",
                    border: "1.5px solid rgba(139,92,246,0.25)",
                  }}
                >
                  📷
                </div>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 500 }}>
                  사진 업로드
                </p>
                <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>JPG, PNG, HEIC · 드래그 또는 클릭</p>
              </div>
            )}
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </label>

          {/* Textarea */}
          <div style={{ position: "relative" }}>
            <textarea
              placeholder="이 순간의 소확행을 100자 이내로 남겨주세요…"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              rows={3}
              style={{
                width: "100%",
                padding: "14px 16px 36px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.07)",
                border: "1.5px solid rgba(255,255,255,0.10)",
                color: "#fff",
                fontSize: 14,
                fontFamily: "var(--font-body)",
                outline: "none",
                resize: "none",
                lineHeight: 1.6,
                caretColor: "#8b5cf6",
                boxSizing: "border-box",
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
            <span
              style={{
                position: "absolute",
                bottom: 12,
                right: 14,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "var(--font-display)",
                color: remaining <= 15 ? (remaining <= 0 ? "#f87171" : "#fb923c") : "rgba(255,255,255,0.25)",
                pointerEvents: "none",
              }}
            >
              {remaining}
            </span>
          </div>

          {/* Submit */}
          <button
            id="share-submit-btn"
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="btn-joy"
            style={{ width: "100%", height: 52, fontSize: 15, marginTop: 4 }}
          >
            공유하기 ✨
          </button>
        </div>
      </div>
    </div>
  );
}
