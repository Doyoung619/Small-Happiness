"use client";

import { CSSProperties } from "react";

interface BubblePinProps {
  emoji: string;
  hue?: number;
  selected?: boolean;
  bursting?: boolean;
  floatDelay?: number;
  floatPaused?: boolean;
  sourceType?: "community" | "grok-x";
}

export default function BubblePin({ emoji, hue = 223, selected = false, bursting = false, floatDelay = 0, floatPaused = false, sourceType }: BubblePinProps) {
  return (
    <div className={`joy-bubble-container ${bursting ? "joy-bubble-container--bursting" : ""} ${floatPaused ? "joy-bubble-container--paused" : ""}`} style={{ "--hue": hue, "--float-delay": `${floatDelay}s` } as CSSProperties}>
      <div className={`joy-bubble ${selected ? "joy-bubble--active" : ""} ${bursting ? "joy-bubble--bursting" : ""}`}>
        <div className="joy-bubble-emoji">{emoji}</div>
        {sourceType === "grok-x" && <span className="joy-bubble-source" aria-label="Discovered by Grok on X">𝕏</span>}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .joy-bubble-container {
          position: relative;
          width: 56px;
          height: 56px;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
          animation: bubbleFloat 3.2s ease-in-out var(--float-delay) infinite alternate;
          will-change: transform;
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

        .joy-bubble-source {
          position: absolute;
          right: -4px;
          bottom: -3px;
          z-index: 12;
          width: 20px;
          height: 20px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          border: 2px solid #fff;
          background: #0b0b0f;
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          box-shadow: 0 3px 8px rgba(0,0,0,.35);
        }

        .joy-bubble--active {
          box-shadow:
            0 -2px 0 2px hsl(var(--hue), 95%, 97%) inset,
            0 0 0 2px hsl(var(--hue), 95%, 85%) inset,
            0 0 18px 4px hsla(var(--hue), 95%, 80%, 0.95),
            0 0 0 4px rgba(248, 250, 252, 0.5);
          transform: scale(1.08);
        }

        .joy-bubble--bursting {
          animation: bubbleBurst 220ms cubic-bezier(.2,.8,.2,1) forwards;
        }

        .joy-bubble-container--paused {
          animation-play-state: paused;
        }

        .joy-bubble-container--bursting::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: hsl(var(--hue), 90%, 70%);
          box-shadow: 22px 0 #fff, -22px 0 #fff, 0 22px #fff, 0 -22px #fff, 16px 16px hsl(var(--hue), 90%, 70%), -16px -16px hsl(var(--hue), 90%, 70%);
          transform: translate(-50%, -50%) scale(.2);
          animation: bubbleParticles 220ms ease-out forwards;
          pointer-events: none;
        }

        @keyframes bubbleFloat {
          from { transform: translateY(-4px); }
          to { transform: translateY(4px); }
        }

        @keyframes bubbleBurst {
          0% { transform: scale(1); opacity: 1; }
          45% { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(.15); opacity: 0; }
        }

        @keyframes bubbleParticles {
          from { transform: translate(-50%, -50%) scale(.2); opacity: 1; }
          to { transform: translate(-50%, -50%) scale(1.25); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .joy-bubble-container, .joy-bubble--bursting, .joy-bubble-container--bursting::before { animation: none; }
        }

      `}} />
    </div>
  );
}
