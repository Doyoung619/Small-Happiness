"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { detectEmojis } from "@/lib/autoEmoji";
import { createJoy } from "@/lib/joys";

const MAX_CHARS = 100;

function getLocation() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
    });
  });
}

export default function AddJoyPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [photo, setPhoto] = useState<File>();
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  useEffect(() => stopCamera, []);

  const choosePhoto = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Please choose an image smaller than 5 MB.");
      return;
    }
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const openCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setError("Camera access was blocked. Allow camera permission or choose from gallery.");
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) choosePhoto(new File([blob], `joy-${Date.now()}.jpg`, { type: "image/jpeg" }));
      stopCamera();
    }, "image/jpeg", 0.9);
  };

  const changeText = (value: string) => {
    const nextText = value.slice(0, MAX_CHARS);
    setText(nextText);
    const suggestion = detectEmojis(nextText)[0];
    if (suggestion) setEmoji(suggestion.emoji);
  };

  const submit = async () => {
    if (!user || !text.trim()) return;
    setSaving(true);
    setError("");
    try {
      const position = await getLocation();
      await createJoy({
        uid: user.uid,
        text: text.trim(),
        emoji,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        photo,
      });
      router.push("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not share this joy.");
      setSaving(false);
    }
  };

  return (
    <div className="scroll-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0d0c14" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 20 }}>
        <button onClick={() => router.back()} aria-label="Close" className="pressable" style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", color: "#fff", fontSize: 20, cursor: "pointer" }}>✕</button>
        <strong style={{ fontFamily: "var(--font-display)" }}>Share Joy</strong>
        <div style={{ width: 40 }} />
      </header>

      <div style={{ flex: 1, padding: "0 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", borderRadius: 24, overflow: "hidden", background: "linear-gradient(135deg,rgba(139,92,246,.2),rgba(244,114,182,.15))", border: "2px dashed rgba(255,255,255,.2)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          {cameraOpen ? (
            <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : preview ? (
            <img src={preview} alt="Selected joy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 48 }}>📸</div><strong>Add a Photo</strong><p style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>Use your webcam or gallery</p></div>
          )}
          <div style={{ position: cameraOpen || preview ? "absolute" : "static", bottom: 14, display: "flex", gap: 10 }}>
            {cameraOpen ? (
              <button type="button" onClick={takePhoto} className="btn-joy" style={{ padding: "10px 18px" }}>Take Photo</button>
            ) : (
              <button type="button" onClick={openCamera} className="btn-joy" style={{ padding: "10px 18px" }}>Use Webcam</button>
            )}
            <label className="pressable" style={{ padding: "10px 18px", borderRadius: 999, background: "rgba(255,255,255,.12)", cursor: "pointer", fontWeight: 700 }}>
              Choose File
              <input type="file" accept="image/*" hidden onChange={(event) => { stopCamera(); choosePhoto(event.target.files?.[0]); }} />
            </label>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <textarea value={text} onChange={(event) => changeText(event.target.value)} placeholder="Describe this little joy…" rows={3} style={{ width: "100%", padding: "16px 16px 36px", borderRadius: 20, boxSizing: "border-box", background: "rgba(255,255,255,.05)", border: "1.5px solid rgba(255,255,255,.1)", color: "#fff", fontSize: 15, resize: "none" }} />
          <span style={{ position: "absolute", right: 16, bottom: 12, color: "rgba(255,255,255,.35)", fontSize: 12 }}>{MAX_CHARS - text.length}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "rgba(255,255,255,.6)", fontSize: 13 }}>
          <span style={{ fontSize: 28 }}>{emoji}</span>
          <span>Posted at your current location as guest-{user?.uid.slice(0, 6) || "…"}</span>
        </div>
        {error && <p role="alert" style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
      </div>

      <div style={{ padding: 20 }}>
        <button onClick={submit} disabled={loading || !user || !text.trim() || saving} className="btn-joy" style={{ width: "100%", height: 56, opacity: loading || !text.trim() ? 0.5 : 1 }}>
          {saving ? "Sharing…" : `${emoji} Share Publicly`}
        </button>
      </div>
    </div>
  );
}
