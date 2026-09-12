"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  // Keep map screen controls at top, and hide nav in full-feature pages
  if (pathname === "/" || pathname === "/add" || pathname === "/search" || pathname === "/explore" || pathname === "/menu") return null;

  const tabs = [
    { name: "탐색", path: "/", icon: "🗺️" },
    { name: "메뉴", path: "/menu", icon: "⋮" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: "var(--app-bottom-nav-lift)",
        left: 0,
        right: 0,
        height: "var(--app-bottom-nav-height)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)",
        paddingTop: "12px",
        pointerEvents: "none",
        zIndex: 40,
      }}
    >
      <div
        style={{
          width: "min(100%, 720px)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 12px 12px",
          pointerEvents: "auto",
        }}
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.path;
          
          return (
            <Link
              key={tab.name}
              href={tab.path}
              aria-label={tab.name}
              style={{
                width: 52,
                height: 52,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isActive
                  ? "rgba(139, 92, 246, 0.25)"
                  : "rgba(13, 12, 20, 0.8)",
                border: isActive
                  ? "1px solid rgba(255,255,255,.22)"
                  : "1px solid rgba(255,255,255,.12)",
                color: isActive ? "#fff" : "rgba(255, 255, 255, 0.6)",
                textDecoration: "none",
                gap: 0,
                boxShadow: isActive ? "0 10px 24px rgba(0,0,0,.28)" : "none",
                transition: "all .2s ease",
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{tab.icon}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
