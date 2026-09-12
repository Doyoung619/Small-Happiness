import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { RuntimeProviders } from "@/components/RuntimeProviders";

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
        <RuntimeProviders>
          <main>{children}</main>
          <BottomNav />
        </RuntimeProviders>
      </body>
    </html>
  );
}
