"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  // Do not show bottom nav on Add Joy page or Search page (full screen flows)
  if (pathname === "/add" || pathname === "/search") return null;

  const tabs = [
    { name: "Map", path: "/", icon: "📍" },
    { name: "Explore", path: "/explore", icon: "✨" },
    { name: "Menu", path: "/menu", icon: "☰" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "80px",
        background: "rgba(13, 12, 20, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 40,
      }}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;
        return (
          <Link
            key={tab.name}
            href={tab.path}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              textDecoration: "none",
              color: isActive ? "#f472b6" : "rgba(255, 255, 255, 0.4)",
              transition: "color 0.2s ease",
            }}
          >
            <span style={{ fontSize: "24px", filter: isActive ? "drop-shadow(0 0 8px rgba(244,114,182,0.6))" : "none" }}>
              {tab.icon}
            </span>
            <span style={{ fontSize: "11px", fontWeight: isActive ? 700 : 500, fontFamily: "var(--font-display)" }}>
              {tab.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
