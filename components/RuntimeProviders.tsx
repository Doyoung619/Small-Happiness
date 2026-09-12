"use client";

import type { FirebaseOptions } from "firebase/app";
import { createContext, useContext, useEffect, useState } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { configureFirebase } from "@/lib/firebase";

type RuntimeConfig = {
  googleMapsApiKey: string;
  firebase: FirebaseOptions;
};

const RuntimeConfigContext = createContext<RuntimeConfig | null>(null);

export function RuntimeProviders({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/config", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load app configuration.");
        return data as RuntimeConfig;
      })
      .then((data) => {
        if (!active) return;
        configureFirebase(data.firebase);
        setConfig(data);
      })
      .catch((caught) => active && setError(caught instanceof Error ? caught.message : "Could not start JoyWalk."));
    return () => {
      active = false;
    };
  }, []);

  if (!config) {
    return (
      <main className="viewport-page" style={{ display: "grid", placeItems: "center", padding: 24, background: "var(--bg-base)" }}>
        <p role={error ? "alert" : "status"} style={{ color: error ? "#f87171" : "rgba(255,255,255,.7)", textAlign: "center" }}>
          {error || "Loading JoyWalk…"}
        </p>
      </main>
    );
  }

  return (
    <RuntimeConfigContext value={config}>
      <AuthProvider>{children}</AuthProvider>
    </RuntimeConfigContext>
  );
}

export function useRuntimeConfig() {
  const config = useContext(RuntimeConfigContext);
  if (!config) throw new Error("JoyWalk configuration is not ready.");
  return config;
}
