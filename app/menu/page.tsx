"use client";

import { useAuth } from "@/components/AuthProvider";

export default function MenuPage() {
  const { user, loading } = useAuth();
  const menuGroups = [
    {
      title: "Account",
      items: [
        { label: "Profile", icon: "👤" },
        { label: "Friends", icon: "👯" },
        { label: "Notifications", icon: "🔔" },
      ],
    },
    {
      title: "Preferences",
      items: [
        { label: "Map Settings", icon: "🗺️" },
        { label: "Joy Filters", icon: "✨" },
        { label: "Dark Mode", icon: "🌙", action: "toggle" },
      ],
    },
    {
      title: "Support",
      items: [
        { label: "Help Center", icon: "❓" },
        { label: "About JoyWalk", icon: "ℹ️" },
      ],
    },
  ];

  return (
    <div className="scroll-page" style={{ minHeight: "100vh", padding: "20px 20px 100px" }}>
      {/* Profile Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px", padding: "20px", borderRadius: "24px", background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(244,114,182,0.05))", border: "1px solid rgba(139,92,246,0.2)" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>
          🐶
        </div>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "20px", color: "#fff" }}>
            {loading ? "Connecting…" : "Guest Walker"}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", marginTop: "2px" }}>
            ID: {user?.uid || "creating guest ID…"}
          </p>
        </div>
      </div>

      {/* Menu Groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {menuGroups.map((group, i) => (
          <div key={i}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", color: "rgba(255,255,255,0.4)", marginBottom: "12px", paddingLeft: "4px" }}>
              {group.title}
            </h3>
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
              {group.items.map((item, j) => (
                <div
                  key={j}
                  className="pressable"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "16px",
                    borderBottom: j < group.items.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "20px", width: "24px", textAlign: "center" }}>{item.icon}</span>
                  <span style={{ flex: 1, fontSize: "15px", fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>{item.label}</span>
                  {item.action === "toggle" ? (
                    <div style={{ width: "40px", height: "24px", borderRadius: "12px", background: "#8b5cf6", position: "relative" }}>
                      <div style={{ position: "absolute", top: "2px", right: "2px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff" }} />
                    </div>
                  ) : (
                    <span style={{ color: "rgba(255,255,255,0.2)" }}>›</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
