"use client";

import { CSSProperties } from "react";

interface BubblePinProps {
  emoji: string;
  hue?: number;
  selected?: boolean;
}

export default function BubblePin({ emoji, hue = 223, selected = false }: BubblePinProps) {
  return (
    <div className="joy-bubble-container" style={{ "--hue": hue } as CSSProperties}>
      <div className={`joy-bubble ${selected ? "joy-bubble--active" : ""}`}>
        <div className="joy-bubble-emoji">{emoji}</div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .joy-bubble-container {
          position: relative;
          width: 56px;
          height: 56px;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
        }

        .joy-bubble {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          
          /* The base glass and colored edges based on user's hue */
          box-shadow:
            0 -2px 0 2px hsl(var(--hue), 90%, 90%) inset,
            0 0 0 2px hsl(var(--hue), 90%, 70%) inset,
            0 0 10px 4px hsla(var(--hue), 90%, 70%, 0.6) inset;
            
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          
        }

        /* The shiny highlight (glass reflection) */
        .joy-bubble::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-image: radial-gradient(40% 25% at 50% 12%, hsla(0,0%,100%, 0.85) 40%, hsla(0,0%,100%,0) 50%);
          transform: rotate(-20deg);
          pointer-events: none;
        }

        .joy-bubble-emoji {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 26px;
          z-index: 10;
          pointer-events: none;
        }

        .joy-bubble--active {
          box-shadow:
            0 -2px 0 2px hsl(var(--hue), 95%, 97%) inset,
            0 0 0 2px hsl(var(--hue), 95%, 85%) inset,
            0 0 18px 4px hsla(var(--hue), 95%, 80%, 0.95),
            0 0 0 4px rgba(248, 250, 252, 0.5);
          transform: scale(1.08);
        }

      `}} />
    </div>
  );
}
