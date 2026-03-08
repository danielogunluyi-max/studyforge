"use client";

import { useEffect, useMemo } from "react";

type NovaLevelUpToastProps = {
  level: number;
  visible: boolean;
  onClose: () => void;
};

function ToastNovaSVG() {
  return (
    <svg viewBox="0 0 60 60" width="56" height="56" aria-hidden="true">
      <circle cx="30" cy="32" r="22" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="8" />
      <circle cx="30" cy="32" r="18" fill="rgba(255,255,255,0.16)" stroke="white" strokeWidth="1.5" />
      <circle cx="24" cy="30" r="3" fill="white" />
      <circle cx="36" cy="30" r="3" fill="white" />
      <path d="M22 38 Q30 44 38 38" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function NovaLevelUpToast({ level, visible, onClose }: NovaLevelUpToastProps) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 20 }).map((_, index) => {
        const drift = Math.round((Math.random() - 0.5) * 220);
        const delay = Math.round(Math.random() * 300);
        const duration = 1100 + Math.round(Math.random() * 500);
        const hue = 180 + Math.round(Math.random() * 120);
        return { id: index, drift, delay, duration, color: `hsl(${hue} 95% 68%)` };
      }),
    [visible],
  );

  useEffect(() => {
    if (!visible) return;
    const timeout = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timeout);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        right: 16,
        zIndex: 1100,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 920,
          background: "linear-gradient(135deg, var(--accent-purple), var(--accent-blue))",
          color: "white",
          borderRadius: 14,
          padding: "12px 16px",
          boxShadow: "0 20px 44px rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "relative",
          overflow: "hidden",
          animation: "nova-level-slide 260ms ease-out",
        }}
      >
        <ToastNovaSVG />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>
            ⭐ Nova leveled up! Now Level {level}
          </p>
        </div>

        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {confetti.map((item) => (
            <span
              key={item.id}
              style={{
                position: "absolute",
                left: "50%",
                top: "55%",
                width: 4,
                height: 4,
                borderRadius: 1,
                background: item.color,
                opacity: 0,
                animation: `nova-confetti ${item.duration}ms ease-out ${item.delay}ms forwards`,
                ["--nova-x" as string]: `${item.drift}px`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes nova-level-slide {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes nova-confetti {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--nova-x), -90px) scale(0.4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
