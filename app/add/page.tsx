"use client";

import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { gps } from "exifr";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import MapViewer from "@/components/MapViewer";
import { useRuntimeConfig } from "@/components/RuntimeProviders";
import { detectEmojis } from "@/lib/autoEmoji";
import { createJoy } from "@/lib/joys";
import { searchSongs, Song } from "@/lib/music";

const MAX_CHARS = 100;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_SIDE = 2048;
const DEFAULT_LOCATION = { lat: 40.4433, lng: -79.9436 };
const libraries: ("places")[] = ["places"];

async function compressPhoto(file: File) {
  if (file.size <= MAX_UPLOAD_BYTES) return file;
  const image = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare this image.");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("Could not compress this image.");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "joy"}.jpg`, { type: "image/jpeg" });
}

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
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment");
  const [visibility, setVisibility] = useState<"public" | "friends">("public");
  const [durationHours, setDurationHours] = useState<1 | 6 | 12 | 24 | 168>(24);
  const [musicQuery, setMusicQuery] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [song, setSong] = useState<Song>();
  const [musicSearching, setMusicSearching] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [customLocationSelected, setCustomLocationSelected] = useState(false);
  const [photoLocation, setPhotoLocation] = useState<{ lat: number; lng: number }>();
  const [pinLocation, setPinLocation] = useState(DEFAULT_LOCATION);
  const [locationMessage, setLocationMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const { googleMapsApiKey } = useRuntimeConfig();
  const { isLoaded } = useJsApiLoader({ id: "google-map-script", googleMapsApiKey, libraries });

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  useEffect(() => stopCamera, []);

  useEffect(() => {
    if (!isLoaded || !photoLocation) return;
    void new google.maps.Geocoder().geocode({ location: photoLocation }).then(({ results }) => {
      setLocationMessage(results[0]?.formatted_address || `${photoLocation.lat.toFixed(5)}, ${photoLocation.lng.toFixed(5)}`);
    }).catch(() => setLocationMessage(`${photoLocation.lat.toFixed(5)}, ${photoLocation.lng.toFixed(5)}`));
  }, [isLoaded, photoLocation]);

  const choosePhoto = async (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setError("");
    const coordinates = await gps(file).catch(() => undefined);
    const uploadPhoto = await compressPhoto(file).catch(() => undefined);
    if (!uploadPhoto) {
      setError("Could not compress this image. Please choose another photo.");
      return;
    }
    setPhoto(uploadPhoto);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(uploadPhoto);
    if (coordinates && Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude)) {
      const location = { lat: coordinates.latitude, lng: coordinates.longitude };
      setPinLocation(location);
      setPhotoLocation(location);
      setCustomLocationSelected(true);
      setLocationPickerOpen(false);
      setLocationMessage("Finding photo location…");
    }
  };

  const openCamera = async (facing: "user" | "environment" = cameraFacing) => {
    setError("");
    streamRef.current?.getTracks().forEach((track) => track.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false });
      streamRef.current = stream;
      setCameraFacing(facing);
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
      if (blob) void choosePhoto(new File([blob], `joy-${Date.now()}.jpg`, { type: "image/jpeg" }));
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
      const position = customLocationSelected ? null : await getLocation();
      await createJoy({
        uid: user.uid,
        text: text.trim(),
        emoji,
        lat: position?.coords.latitude ?? pinLocation.lat,
        lng: position?.coords.longitude ?? pinLocation.lng,
        photo,
        author: user.displayName,
        visibility,
        durationHours,
        song,
      });
      router.push("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not share this joy.");
      setSaving(false);
    }
  };

  const findSongs = async () => {
    if (!musicQuery.trim()) return;
    setMusicSearching(true);
    setError("");
    try {
      setSongs((await searchSongs(musicQuery)).songs);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not search music.");
    } finally {
      setMusicSearching(false);
    }
  };

  const toggleLocationPicker = async () => {
    if (locationPickerOpen) {
      setLocationPickerOpen(false);
      return;
    }
    setLocationPickerOpen(true);
    if (customLocationSelected) return;
    try {
      const position = await getLocation();
      setPinLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      setCustomLocationSelected(true);
      setLocationMessage("Using your current location. Move the map to adjust it.");
    } catch {
      setLocationMessage("Move the map to choose a location.");
    }
  };

  const chooseSearchedPlace = () => {
    const place = autocompleteRef.current?.getPlace();
    const location = place?.geometry?.location;
    if (!location) return;
    setPinLocation({ lat: location.lat(), lng: location.lng() });
    setCustomLocationSelected(true);
    setLocationMessage(place.name || place.formatted_address || "Selected location");
  };

  return (
    <div className="scroll-page" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#0d0c14", overscrollBehaviorY: "contain" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 20 }}>
        <button onClick={() => router.back()} aria-label="Close" className="pressable" style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", color: "#fff", fontSize: 20, cursor: "pointer" }}>✕</button>
        <strong style={{ fontFamily: "var(--font-display)" }}>Share Joy</strong>
        <div style={{ width: 40 }} />
      </header>

      <div style={{ flex: 1, padding: "0 20px 48px", display: "flex", flexDirection: "column", gap: 20 }}>
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
              <>
                <button type="button" onClick={() => void openCamera(cameraFacing === "user" ? "environment" : "user")} aria-label={`Switch to ${cameraFacing === "user" ? "rear" : "front"} camera`} className="pressable" style={{ width: 44, height: 44, borderRadius: 999, border: "1px solid rgba(255,255,255,.2)", background: "rgba(13,12,20,.72)", color: "#fff", fontSize: 20 }}>🔄</button>
                <button type="button" onClick={takePhoto} className="btn-joy" style={{ padding: "10px 18px" }}>Take Photo</button>
              </>
            ) : (
              <button type="button" onClick={() => void openCamera()} className="btn-joy" style={{ padding: "10px 18px" }}>Use Camera</button>
            )}
            <label className="pressable" style={{ padding: "10px 18px", borderRadius: 999, background: "rgba(255,255,255,.12)", cursor: "pointer", fontWeight: 700 }}>
              Choose File
              <input type="file" accept="image/*" hidden onChange={(event) => { stopCamera(); void choosePhoto(event.target.files?.[0]); }} />
            </label>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <textarea value={text} onChange={(event) => changeText(event.target.value)} placeholder="Describe this little joy…" rows={3} style={{ width: "100%", padding: "16px 16px 36px", borderRadius: 20, boxSizing: "border-box", background: "rgba(255,255,255,.05)", border: "1.5px solid rgba(255,255,255,.1)", color: "#fff", fontSize: 15, resize: "none" }} />
          <span style={{ position: "absolute", right: 16, bottom: 12, color: "rgba(255,255,255,.35)", fontSize: 12 }}>{MAX_CHARS - text.length}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "rgba(255,255,255,.6)", fontSize: 13 }}>
          <span style={{ fontSize: 28 }}>{emoji}</span>
          <span>Posted at your current location as {user?.displayName || `guest-${user?.uid.slice(0, 6) || "…"}`}</span>
        </div>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ color: "rgba(255,255,255,.65)", fontSize: 13 }}>Song (optional)</span>
          {song ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 16, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)" }}>
              <img src={song.artworkUrl} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover" }} />
              <div style={{ flex: 1, minWidth: 0 }}><strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.title}</strong><small style={{ color: "rgba(255,255,255,.5)" }}>{song.artist}</small></div>
              <button type="button" onClick={() => setSong(undefined)} aria-label="Remove song" className="pressable" style={{ width: 36, height: 36, borderRadius: 999, border: 0, background: "rgba(255,255,255,.1)", color: "#fff" }}>✕</button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={musicQuery} onChange={(event) => setMusicQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void findSongs(); }} placeholder="Search title or artist" style={{ flex: 1, minWidth: 0, padding: "13px 14px", borderRadius: 14, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)", color: "#fff" }} />
                <button type="button" onClick={findSongs} disabled={musicSearching || !musicQuery.trim()} className="pressable" style={{ padding: "0 16px", borderRadius: 14, border: 0, background: "#8b5cf6", color: "#fff", fontWeight: 700 }}>{musicSearching ? "…" : "Search"}</button>
              </div>
              {!!songs.length && <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                {songs.map((item) => (
                  <button key={item.id} type="button" onClick={() => { setSong(item); setSongs([]); }} className="pressable" style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#fff", textAlign: "left" }}>
                    <img src={item.artworkUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8 }} />
                    <span style={{ minWidth: 0 }}><strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>{item.title}</strong><small style={{ color: "rgba(255,255,255,.5)" }}>{item.artist} · {item.album}</small></span>
                  </button>
                ))}
                <small style={{ color: "rgba(255,255,255,.35)", textAlign: "right" }}>Courtesy of iTunes</small>
              </div>}
            </>
          )}
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button type="button" onClick={toggleLocationPicker} className="pressable" style={{ width: "100%", padding: "14px 16px", borderRadius: 16, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "#fff", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span>📍 Custom location</span><span>{locationPickerOpen ? "Hide" : customLocationSelected ? "Edit" : "Choose"}</span>
          </button>
          {!locationPickerOpen && customLocationSelected && <small style={{ padding: "0 4px", color: "rgba(255,255,255,.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{locationMessage}</small>}
          {locationPickerOpen && (
            <div>
              {isLoaded && (
                <Autocomplete onLoad={(autocomplete) => { autocompleteRef.current = autocomplete; }} onPlaceChanged={chooseSearchedPlace}>
                  <input type="search" placeholder="Search a place or address" aria-label="Search custom location" style={{ width: "100%", marginBottom: 10, padding: "13px 14px", borderRadius: 14, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)", color: "#fff" }} />
                </Autocomplete>
              )}
              <div style={{ position: "relative", width: "100%", height: 280, borderRadius: 18, overflow: "hidden" }}>
                <MapViewer pins={[]} center={pinLocation} zoom={17} onCenterChanged={setPinLocation} />
                <span aria-hidden style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -100%)", zIndex: 5, fontSize: 34, pointerEvents: "none", filter: "drop-shadow(0 3px 3px rgba(0,0,0,.4))" }}>📍</span>
              </div>
              <p style={{ marginTop: 8, color: "rgba(255,255,255,.5)", fontSize: 12 }}>{locationMessage || "Move the map to place the pin at the center."} · {pinLocation.lat.toFixed(5)}, {pinLocation.lng.toFixed(5)}</p>
            </div>
          )}
        </section>

        <label style={{ display: "flex", flexDirection: "column", gap: 8, color: "rgba(255,255,255,.65)", fontSize: 13 }}>
          Visibility
          <select
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as "public" | "friends")}
            style={{ width: "100%", padding: "14px 16px", borderRadius: 16, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)", color: "#fff" }}
          >
            <option value="public">Public</option>
            <option value="friends">Friends</option>
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 8, color: "rgba(255,255,255,.65)", fontSize: 13 }}>
          Visible for
          <select
            value={durationHours}
            onChange={(event) => setDurationHours(Number(event.target.value) as 1 | 6 | 12 | 24 | 168)}
            style={{ width: "100%", padding: "14px 16px", borderRadius: 16, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)", color: "#fff" }}
          >
            <option value={1}>1 hour</option>
            <option value={6}>6 hours</option>
            <option value={12}>12 hours</option>
            <option value={24}>1 day</option>
            <option value={168}>1 week</option>
          </select>
        </label>
        {error && <p role="alert" style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
      </div>

      <div style={{ padding: "20px 20px calc(env(safe-area-inset-bottom) + 96px)", flexShrink: 0 }}>
        <button onClick={submit} disabled={loading || !user || !text.trim() || saving} className="btn-joy" style={{ width: "100%", height: 56, opacity: loading || !text.trim() ? 0.5 : 1 }}>
          {saving ? "Sharing…" : `${emoji} Share ${visibility === "public" ? "Publicly" : "with Friends"}`}
        </button>
      </div>
    </div>
  );
}
