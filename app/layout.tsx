import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "JoyWalk — Micro-Happiness Map",
  description:
    "Discover hidden micro-happiness spots on your daily walk. JoyWalk creates slightly longer routes that guarantee a small joy discovery.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body antialiased" style={{ background: "#0d0c14", color: "#fff" }}>
        <AuthProvider>
          <main style={{ paddingBottom: "80px", minHeight: "100vh" }}>
            {children}
          </main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
