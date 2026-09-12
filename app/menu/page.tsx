"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { LANGUAGES } from "@/lib/languages";
import { acceptFriendRequest, declineFriendRequest, FriendRequest, saveUserLanguage, saveUserName, sendFriendRequest, subscribeToFriendRequests, subscribeToProfile, UserProfile } from "@/lib/friends";

export default function MenuPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [friendName, setFriendName] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    return subscribeToProfile(user.uid, setProfile, setMessage);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeToFriendRequests(user.uid, setRequests, setMessage);
  }, [user]);

  const saveName = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      if (!user) return;
      await saveUserName(user, name);
      setMessage("Name saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save name.");
    } finally {
      setBusy(false);
    }
  };

  const addFriend = async () => {
    if (!user || !friendName.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      await sendFriendRequest(user, friendName);
      setFriendName("");
      setMessage("Friend request sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send friend request.");
    } finally {
      setBusy(false);
    }
  };

  const acceptRequest = async (request: FriendRequest) => {
    if (!user) return;
      setBusy(true);
      setMessage("");
      try {
      await acceptFriendRequest(request);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not accept request.");
    } finally {
      setBusy(false);
    }
  };

  const loginWithGoogle = async () => {
    setBusy(true);
    setMessage("");
    try {
      await signInWithGoogle();
      setMessage("Google login connected.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not login with Google.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scroll-page" style={{ minHeight: "100vh", padding: "calc(env(safe-area-inset-top) + 74px) 20px 100px" }}>
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

      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px", padding: "20px", borderRadius: "24px", background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(244,114,182,0.05))", border: "1px solid rgba(139,92,246,0.2)" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>
          {user?.photoURL ? <img src={user.photoURL} alt="Profile" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : "👤"}
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "20px", color: "#fff" }}>
            {loading ? "Connecting…" : profile?.displayName || user?.displayName || "Guest Walker"}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", marginTop: "2px" }}>
            {user?.isAnonymous ? "Anonymous" : user?.email || "ID"}: {user?.uid.slice(0, 8) || "creating…"}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <section style={sectionStyle}>
          <h3 style={sectionTitle}>Account</h3>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={profile?.displayName || user?.displayName || (user ? `guest-${user.uid.slice(0, 6)}` : "Display name")} style={inputStyle} />
          <label style={{ display: "flex", flexDirection: "column", gap: 8, color: "rgba(255,255,255,.55)", fontSize: 13 }}>
            Language
            <select
              value={profile?.language || "en"}
              onChange={async (event) => {
                setBusy(true);
                setMessage("");
                try {
                  setProfile(await saveUserLanguage(event.target.value));
                  setMessage("Language saved.");
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Could not save language.");
                } finally {
                  setBusy(false);
                }
              }}
              style={inputStyle}
            >
              {LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
            </select>
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={saveName} disabled={busy || !name.trim()} className="btn-joy" style={{ flex: 1 }}>Save Name</button>
            <button type="button" onClick={loginWithGoogle} disabled={busy} className="pressable" style={secondaryButton}>Google Login</button>
          </div>
        </section>

        <section style={sectionStyle}>
          <h3 style={sectionTitle}>Friends</h3>
          <div style={{ display: "flex", gap: 10 }}>
            <input value={friendName} onChange={(event) => setFriendName(event.target.value)} placeholder="Friend name" style={inputStyle} />
            <button type="button" onClick={addFriend} disabled={busy || !friendName.trim()} className="pressable" style={secondaryButton}>Add</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {requests.map((request) => (
              <div key={request.id} style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong>{request.fromName}</strong>
                  <span style={{ color: "#a3e635", fontSize: 12 }}>Request</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button type="button" onClick={() => acceptRequest(request)} disabled={busy} className="pressable" style={secondaryButton}>Accept</button>
                  <button type="button" onClick={() => declineFriendRequest(request.id)} disabled={busy} className="pressable" style={secondaryButton}>Decline</button>
                </div>
              </div>
            ))}
            {(profile?.friendIds || []).map((id) => (
              <div key={id} style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
                <strong>{profile?.friendNames?.[id] || `guest-${id.slice(0, 6)}`}</strong>
              </div>
            ))}
            {!requests.length && !(profile?.friendIds || []).length && <p style={{ color: "rgba(255,255,255,.45)", fontSize: 13 }}>No friends yet.</p>}
          </div>
        </section>

        {message && <p role="status" style={{ color: message.includes("Could") || message.includes("not") ? "#f87171" : "#a3e635", fontSize: 13 }}>{message}</p>}
      </div>
    </div>
  );
}

const sectionStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 12,
  padding: 16,
  borderRadius: 20,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const sectionTitle = {
  fontFamily: "var(--font-display)",
  fontWeight: 600,
  fontSize: 14,
  color: "rgba(255,255,255,0.5)",
};

const inputStyle = {
  width: "100%",
  minWidth: 0,
  padding: "13px 14px",
  borderRadius: 14,
  background: "rgba(255,255,255,.06)",
  border: "1px solid rgba(255,255,255,.14)",
  color: "#fff",
};

const secondaryButton = {
  padding: "0 16px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.14)",
  background: "rgba(255,255,255,.08)",
  color: "#fff",
  fontWeight: 700,
};
