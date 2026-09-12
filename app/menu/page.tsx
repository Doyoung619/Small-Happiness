"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createGroup, joinGroupByCode, JoyGroup, subscribeToGroups } from "@/lib/groups";

export default function MenuPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle, changeName } = useAuth();
  const [name, setName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [groups, setGroups] = useState<JoyGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    return subscribeToGroups(user.uid, setGroups, setMessage);
  }, [user]);

  const saveName = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      await changeName(name);
      setMessage("Name saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save name.");
    } finally {
      setBusy(false);
    }
  };

  const addGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      await createGroup(user.uid, newGroupName, user.displayName || name);
      setNewGroupName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create group.");
    } finally {
      setBusy(false);
    }
  };

  const joinGroup = async () => {
    if (!user || !inviteCode.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      await joinGroupByCode(user.uid, inviteCode, user.displayName || name);
      setInviteCode("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not join group.");
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
            {loading ? "Connecting…" : user?.displayName || "Guest Walker"}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", marginTop: "2px" }}>
            {user?.isAnonymous ? "Anonymous" : user?.email || "ID"}: {user?.uid.slice(0, 8) || "creating…"}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <section style={sectionStyle}>
          <h3 style={sectionTitle}>Account</h3>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={user?.displayName || (user ? `guest-${user.uid.slice(0, 6)}` : "Display name")} style={inputStyle} />
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={saveName} disabled={busy || !name.trim()} className="btn-joy" style={{ flex: 1 }}>Save Name</button>
            <button type="button" onClick={signInWithGoogle} disabled={busy} className="pressable" style={secondaryButton}>Google Login</button>
          </div>
        </section>

        <section style={sectionStyle}>
          <h3 style={sectionTitle}>Friend Groups</h3>
          <div style={{ display: "flex", gap: 10 }}>
            <input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} placeholder="New group name" style={inputStyle} />
            <button type="button" onClick={addGroup} disabled={busy || !newGroupName.trim()} className="pressable" style={squareButton}>+</button>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} placeholder="Invite code" style={inputStyle} />
            <button type="button" onClick={joinGroup} disabled={busy || !inviteCode.trim()} className="pressable" style={secondaryButton}>Join</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {groups.map((group) => (
              <div key={group.id} style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong>{group.name}</strong>
                  <code style={{ color: "#a3e635" }}>{group.inviteCode}</code>
                </div>
                <p style={{ marginTop: 8, color: "rgba(255,255,255,.48)", fontSize: 12 }}>
                  {(group.memberIds || []).map((id) => group.memberNames?.[id] || `guest-${id.slice(0, 6)}`).join(", ")}
                </p>
              </div>
            ))}
            {!groups.length && <p style={{ color: "rgba(255,255,255,.45)", fontSize: 13 }}>No groups yet.</p>}
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

const squareButton = {
  width: 48,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.14)",
  background: "rgba(255,255,255,.08)",
  color: "#fff",
  fontSize: 24,
};
