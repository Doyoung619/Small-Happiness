"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import JoyCard from "@/components/JoyCard";
import MapViewer from "@/components/MapViewer";
import { subscribeToProfile, UserProfile } from "@/lib/friends";
import { Joy, subscribeToJoys } from "@/lib/joys";

type Filter = "all" | "public" | "friends" | "mine";

export default function ExplorePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [joys, setJoys] = useState<Joy[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selected, setSelected] = useState<Joy | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    return subscribeToProfile(user.uid, setProfile, () => setError("Could not load profile."));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeToJoys(setJoys, () => setError("Could not load joys."), profile?.language);
  }, [user, profile?.language]);

  const visible = filter === "mine"
    ? joys.filter((joy) => joy.authorId === user?.uid)
    : filter === "public" ? joys.filter((joy) => joy.visibility === "public")
    : filter === "friends" ? joys.filter((joy) => profile?.friendIds.includes(joy.authorId))
    : joys;

  return (
    <div className="explore-container" style={{ paddingTop: "calc(env(safe-area-inset-top) + 74px)" }}>
      <button
        onClick={() => router.back()}
        aria-label="Go back"
        className="pressable"
        style={{
          position: "fixed",
          top: "calc(env(safe-area-inset-top) + 12px)",
          left: 14,
          zIndex: 80,
          width: 42,
          height: 42,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.2)",
          background: "rgba(13, 12, 20, 0.85)",
          color: "#fff",
          fontSize: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ←
      </button>

      <section className="explore-feed">
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28 }}>Explore Joy</h1>
          <p style={{ color: "rgba(255,255,255,.4)", fontSize: 14 }}>Live joys shared by the community</p>
        </header>

        <div style={{ display: "flex", gap: 10, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
          {([['all', 'All'], ['public', 'Public'], ['friends', 'Friends'], ['mine', 'Mine']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} className="pressable" style={{ padding: "10px 15px", borderRadius: 99, background: filter === id ? "linear-gradient(135deg,#8b5cf6,#f472b6)" : "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", color: "#fff", cursor: "pointer" }}>{label}</button>
          ))}
        </div>

        {error && <p style={{ color: "#f87171" }}>{error}</p>}
        {!error && visible.length === 0 && <p style={{ color: "rgba(255,255,255,.45)" }}>No joys here yet.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visible.map((joy) => (
            <button key={joy.id} onClick={() => setSelected(joy)} className="pressable" style={{ padding: 16, borderRadius: 20, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", color: "inherit", display: "flex", gap: 14, textAlign: "left", cursor: "pointer" }}>
              <span style={{ width: 54, height: 54, borderRadius: 16, display: "grid", placeItems: "center", background: "rgba(139,92,246,.15)", fontSize: 26 }}>{joy.emoji}</span>
              <span><strong style={{ display: "block", marginBottom: 5 }}>{joy.title}</strong><span style={{ color: "rgba(255,255,255,.55)", fontSize: 13 }}>{joy.description}</span><small style={{ display: "block", color: "#a78bfa", marginTop: 7 }}>@{joy.author} · {joy.visibility}</small></span>
            </button>
          ))}
        </div>
      </section>

      <div className="explore-map">
        <MapViewer pins={visible} center={{ lat: 40.4433, lng: -79.9436 }} zoom={15} onPinClick={(pin) => setSelected(pin as Joy)} onMapClick={() => setSelected(null)} />
      </div>
      <JoyCard pin={selected} waypoints={[]} onClose={() => setSelected(null)} />

      <style>{`
        .explore-container{display:flex;flex-direction:column;height:100dvh;overflow-y:auto;overscroll-behavior:contain;background:#0d0c14}
        .explore-feed{padding:20px;flex:1}.explore-map{height:300px;margin-bottom:80px}
        @media(min-width:1024px){.explore-container{flex-direction:row;height:100vh;overflow:hidden}.explore-feed{width:420px;overflow-y:auto}.explore-map{flex:1;height:100vh;margin:0}}
      `}</style>
    </div>
  );
}
