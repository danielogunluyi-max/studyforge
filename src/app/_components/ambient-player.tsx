"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SoundId = "lofi" | "rain" | "cafe" | "library" | "forest";

type SoundConfig = {
  id: SoundId;
  label: string;
  emoji: string;
  color: string;
};

const sounds: SoundConfig[] = [
  { id: "lofi", label: "Lo-Fi", emoji: "🎵", color: "var(--accent-purple)" },
  { id: "rain", label: "Rain", emoji: "🌧️", color: "var(--accent-blue)" },
  { id: "cafe", label: "Café", emoji: "☕", color: "var(--accent-orange)" },
  { id: "library", label: "Library", emoji: "📚", color: "var(--accent-green)" },
  { id: "forest", label: "Forest", emoji: "🌲", color: "var(--accent-cyan)" },
];

const BASE_LEFT = 16;
const BASE_BOTTOM = 16;
const POS_KEY = "ambientWidgetPos";
const PREFS_KEY = "ambientPrefs";

function findSound(id: string) {
  return sounds.find((sound) => sound.id === id) ?? sounds[0]!;
}

function createBrownNoiseSource(ctx: AudioContext, cutoff = 400) {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;

  for (let i = 0; i < bufferSize; i += 1) {
    const white = Math.random() * 2 - 1;
    const next = (lastOut + 0.02 * white) / 1.02;
    data[i] = next;
    lastOut = next;
    data[i] = next * 3.5;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;

  source.connect(filter);
  source.start();

  return { output: filter, nodes: [source, filter] as AudioNode[] };
}

function createRain(ctx: AudioContext) {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1000;
  filter.Q.value = 0.5;

  const filter2 = ctx.createBiquadFilter();
  filter2.type = "lowpass";
  filter2.frequency.value = 3000;

  source.connect(filter);
  filter.connect(filter2);
  source.start();

  return { output: filter2, nodes: [source, filter, filter2] as AudioNode[] };
}

function scheduleMelody(ctx: AudioContext, gainNode: GainNode): number {
  const notes = [261.6, 329.6, 392.0, 523.3, 392.0, 329.6];
  let i = 0;

  const playNext = () => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = notes[i % notes.length] ?? 329.6;

    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.3);
    env.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);

    osc.connect(env);
    env.connect(gainNode);

    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.8);
    i += 1;
  };

  playNext();
  return window.setInterval(playNext, 2000);
}

function scheduleRainDrops(
  ctx: AudioContext,
  gainNode: GainNode,
  registerTimeout: (timeoutId: number) => void,
) {
  const drip = () => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.frequency.value = 800 + Math.random() * 400;
    osc.type = "sine";

    env.gain.setValueAtTime(0.08, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(env);
    env.connect(gainNode);

    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };

    osc.start();
    osc.stop(ctx.currentTime + 0.15);

    const next = window.setTimeout(drip, 2000 + Math.random() * 6000);
    registerTimeout(next);
  };

  const first = window.setTimeout(drip, 1000);
  registerTimeout(first);
}

function scheduleCafeMurmurs(
  ctx: AudioContext,
  gainNode: GainNode,
  registerTimeout: (timeoutId: number) => void,
) {
  const murmur = () => {
    const bufSize = Math.floor(ctx.sampleRate * 1.5);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);

    for (let i = 0; i < bufSize; i += 1) {
      d[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 300 + Math.random() * 300;
    f.Q.value = 2;

    const env = ctx.createGain();
    const vol = 0.02 + Math.random() * 0.04;
    const dur = 0.3 + Math.random() * 0.9;

    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(vol, ctx.currentTime + dur * 0.3);
    env.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);

    src.connect(f);
    f.connect(env);
    env.connect(gainNode);

    src.onended = () => {
      src.disconnect();
      f.disconnect();
      env.disconnect();
    };

    src.start();
    src.stop(ctx.currentTime + dur + 0.1);

    const next = window.setTimeout(murmur, 1000 + Math.random() * 3000);
    registerTimeout(next);
  };

  murmur();
}

function createLibrary(
  ctx: AudioContext,
  gainNode: GainNode,
  registerTimeout: (timeoutId: number) => void,
) {
  const osc = ctx.createOscillator();
  const humGain = ctx.createGain();

  osc.frequency.value = 60;
  osc.type = "sine";
  humGain.gain.value = 0.015;

  osc.connect(humGain);
  humGain.connect(gainNode);
  osc.start();

  const pageTurn = () => {
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
    const d = buf.getChannelData(0);

    for (let i = 0; i < d.length; i += 1) {
      d[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 3000;
    f.Q.value = 1;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.06, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    src.connect(f);
    f.connect(env);
    env.connect(gainNode);

    src.onended = () => {
      src.disconnect();
      f.disconnect();
      env.disconnect();
    };

    src.start();
    src.stop(ctx.currentTime + 0.15);

    const next = window.setTimeout(pageTurn, 8000 + Math.random() * 12000);
    registerTimeout(next);
  };

  const first = window.setTimeout(pageTurn, 3000);
  registerTimeout(first);

  return { nodes: [osc, humGain] as AudioNode[] };
}

function createForestWind(ctx: AudioContext) {
  const brown = createBrownNoiseSource(ctx, 300);

  const windGain = ctx.createGain();
  windGain.gain.value = 0.04;

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.125;

  const lfoAmount = ctx.createGain();
  lfoAmount.gain.value = 0.02;

  lfo.connect(lfoAmount);
  lfoAmount.connect(windGain.gain);
  brown.output.connect(windGain);
  lfo.start();

  return {
    output: windGain,
    nodes: [...brown.nodes, windGain, lfo, lfoAmount] as AudioNode[],
  };
}

function scheduleBirds(
  ctx: AudioContext,
  gainNode: GainNode,
  registerTimeout: (timeoutId: number) => void,
) {
  const chirp = () => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1400, ctx.currentTime + 0.15);
    osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.3);

    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.05);
    env.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);

    osc.connect(env);
    env.connect(gainNode);

    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };

    osc.start();
    osc.stop(ctx.currentTime + 0.4);

    if (Math.random() > 0.6) {
      const quick = window.setTimeout(chirp, 400);
      registerTimeout(quick);
    }

    const next = window.setTimeout(chirp, 5000 + Math.random() * 10000);
    registerTimeout(next);
  };

  const first = window.setTimeout(chirp, 2000);
  registerTimeout(first);
}

function AnimatedBars() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 14 }}>
      {[0, 150, 300].map((delay) => (
        <div
          key={delay}
          style={{
            width: 3,
            borderRadius: 2,
            background: "var(--accent-blue)",
            animation: "sound-bar 0.9s ease-in-out infinite",
            animationDelay: `${delay}ms`,
            height: 8,
          }}
        />
      ))}
    </div>
  );
}

export default function AmbientPlayer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSoundId, setCurrentSoundId] = useState<string>("lofi");
  const [volume, setVolume] = useState(0.4);
  const [mixMode, setMixMode] = useState(false);
  const [activeSounds, setActiveSounds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<Map<string, AudioNode[]>>(new Map());
  const intervalsRef = useRef<Map<string, number[]>>(new Map());
  const timeoutRef = useRef<Map<string, number[]>>(new Map());
  const soundGainRef = useRef<Map<string, GainNode>>(new Map());
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  const currentSound = useMemo(() => findSound(currentSoundId), [currentSoundId]);

  const clampPos = (nextX: number, nextY: number) => {
    const width = widgetRef.current?.offsetWidth ?? (isExpanded ? 240 : 120);
    const height = widgetRef.current?.offsetHeight ?? (isExpanded ? 320 : 40);

    const maxLeft = Math.max(0, window.innerWidth - width);
    const maxBottom = Math.max(0, window.innerHeight - height);

    const minX = -BASE_LEFT;
    const maxX = maxLeft - BASE_LEFT;
    const minY = BASE_BOTTOM - maxBottom;
    const maxY = BASE_BOTTOM;

    return {
      x: Math.max(minX, Math.min(maxX, nextX)),
      y: Math.max(minY, Math.min(maxY, nextY)),
    };
  };

  useEffect(() => {
    // Collapse on mobile by default
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      setIsExpanded(false);
    }
  }, []);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = volume;
      masterGainRef.current.connect(audioCtxRef.current.destination);
    }

    return audioCtxRef.current;
  };

  const stopSound = (soundId: string) => {
    const intervals = intervalsRef.current.get(soundId) ?? [];
    intervals.forEach((timer) => window.clearInterval(timer));
    intervalsRef.current.delete(soundId);

    const timeouts = timeoutRef.current.get(soundId) ?? [];
    timeouts.forEach((timer) => window.clearTimeout(timer));
    timeoutRef.current.delete(soundId);

    const nodes = activeNodesRef.current.get(soundId) ?? [];
    nodes.forEach((node) => {
      try {
        const stopCapable = node as AudioNode & { stop?: () => void };
        stopCapable.stop?.();
      } catch {
        // Ignore non-stoppable nodes.
      }

      try {
        node.disconnect();
      } catch {
        // Ignore already disconnected nodes.
      }
    });

    activeNodesRef.current.delete(soundId);
    soundGainRef.current.delete(soundId);
  };

  const stopAll = () => {
    const keys = Array.from(activeNodesRef.current.keys());
    keys.forEach((id) => stopSound(id));
  };

  const playSound = async (soundId: string) => {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    stopSound(soundId);

    const soundGain = ctx.createGain();
    soundGain.gain.value = mixMode ? 0.5 : 1;
    soundGain.connect(masterGainRef.current!);

    const nodes: AudioNode[] = [soundGain];
    const intervals: number[] = [];
    const timeouts: number[] = [];

    const registerInterval = (timer: number) => {
      intervals.push(timer);
    };

    const registerTimeout = (timer: number) => {
      timeouts.push(timer);
    };

    if (soundId === "lofi") {
      const brown = createBrownNoiseSource(ctx, 400);
      brown.output.connect(soundGain);
      nodes.push(...brown.nodes);

      const melodyInterval = scheduleMelody(ctx, soundGain);
      registerInterval(melodyInterval);
    }

    if (soundId === "rain") {
      const rain = createRain(ctx);
      rain.output.connect(soundGain);
      nodes.push(...rain.nodes);
      scheduleRainDrops(ctx, soundGain, registerTimeout);
    }

    if (soundId === "cafe") {
      const cafeBase = createBrownNoiseSource(ctx, 800);
      cafeBase.output.connect(soundGain);
      nodes.push(...cafeBase.nodes);
      scheduleCafeMurmurs(ctx, soundGain, registerTimeout);
    }

    if (soundId === "library") {
      const lib = createLibrary(ctx, soundGain, registerTimeout);
      nodes.push(...lib.nodes);
    }

    if (soundId === "forest") {
      const forestWind = createForestWind(ctx);
      forestWind.output.connect(soundGain);
      nodes.push(...forestWind.nodes);
      scheduleBirds(ctx, soundGain, registerTimeout);
    }

    activeNodesRef.current.set(soundId, nodes);
    intervalsRef.current.set(soundId, intervals);
    timeoutRef.current.set(soundId, timeouts);
    soundGainRef.current.set(soundId, soundGain);
  };

  const togglePlay = async () => {
    if (isPlaying) {
      stopAll();
      setIsPlaying(false);
      setActiveSounds(new Set());
      return;
    }

    const idsToPlay = mixMode
      ? (activeSounds.size > 0 ? Array.from(activeSounds) : [currentSoundId])
      : [currentSoundId];

    const normalized = new Set(idsToPlay);
    setActiveSounds(normalized);

    for (const id of idsToPlay) {
      await playSound(id);
    }

    setIsPlaying(true);
  };

  const handleSoundSelect = async (soundId: string) => {
    setCurrentSoundId(soundId);

    if (!mixMode) {
      setActiveSounds(new Set([soundId]));
      if (isPlaying) {
        stopAll();
        await playSound(soundId);
      }
      return;
    }

    const next = new Set(activeSounds);
    const alreadyActive = next.has(soundId);

    if (alreadyActive) {
      next.delete(soundId);
      if (isPlaying) {
        stopSound(soundId);
      }
    } else {
      next.add(soundId);
      if (isPlaying) {
        await playSound(soundId);
      }
    }

    setActiveSounds(next);

    if (isPlaying && next.size === 0) {
      setIsPlaying(false);
    }
  };

  const startDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);

    dragStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      startX: pos.x,
      startY: pos.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.mouseX;
      const deltaY = moveEvent.clientY - dragStartRef.current.mouseY;

      const next = clampPos(
        dragStartRef.current.startX + deltaX,
        dragStartRef.current.startY + deltaY,
      );

      setPos(next);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      sessionStorage.setItem(POS_KEY, JSON.stringify(pos));
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (!isPlaying) return;

    const selectedIds = new Set(activeSounds);

    if (mixMode) {
      soundGainRef.current.forEach((gainNode) => {
        gainNode.gain.value = 0.5;
      });
      return;
    }

    const keepId = currentSoundId;
    selectedIds.forEach((id) => {
      if (id !== keepId) {
        stopSound(id);
      }
    });

    setActiveSounds(new Set([keepId]));

    const keptGain = soundGainRef.current.get(keepId);
    if (keptGain) {
      keptGain.gain.value = 1;
    }

    if (!keptGain) {
      void playSound(keepId);
    }
  }, [mixMode, isPlaying, activeSounds, currentSoundId]);

  useEffect(() => {
    sessionStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        currentSoundId,
        volume,
        mixMode,
      }),
    );
  }, [currentSoundId, volume, mixMode]);

  useEffect(() => {
    const savedPos = sessionStorage.getItem(POS_KEY);
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos) as { x?: number; y?: number };
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPos(clampPos(parsed.x, parsed.y));
        }
      } catch {
        // Ignore invalid position JSON.
      }
    }

    const savedPrefs = sessionStorage.getItem(PREFS_KEY);
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs) as {
          currentSoundId?: string;
          volume?: number;
          mixMode?: boolean;
        };

        if (typeof prefs.currentSoundId === "string") {
          setCurrentSoundId(prefs.currentSoundId);
        }

        if (typeof prefs.volume === "number") {
          setVolume(Math.max(0, Math.min(1, prefs.volume)));
        }

        if (typeof prefs.mixMode === "boolean") {
          setMixMode(prefs.mixMode);
        }
      } catch {
        // Ignore invalid preference JSON.
      }
    }
  }, [isExpanded]);

  useEffect(() => {
    const onResize = () => {
      setPos((current) => clampPos(current.x, current.y));
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isExpanded]);

  useEffect(() => {
    return () => {
      stopAll();
      const ctx = audioCtxRef.current;
      if (ctx) {
        void ctx.close();
      }
    };
  }, []);

  useEffect(() => {
    const onAmbientPlay = (event: Event) => {
      const custom = event as CustomEvent<{ soundId?: string }>;
      const requested = findSound(custom.detail?.soundId ?? "lofi").id;

      setMixMode(false);
      setCurrentSoundId(requested);
      setActiveSounds(new Set([requested]));

      void (async () => {
        stopAll();
        await playSound(requested);
        setIsPlaying(true);
      })();
    };

    document.addEventListener("ambient:play", onAmbientPlay);
    return () => document.removeEventListener("ambient:play", onAmbientPlay);
  }, []);

  const left = BASE_LEFT + pos.x;
  const bottom = BASE_BOTTOM - pos.y;

  return (
    <div
      ref={widgetRef}
      style={{
        position: "fixed",
        bottom,
        left,
        zIndex: 999,
      }}
    >
      {!isExpanded ? (
        <div
          role="button"
          onClick={() => setIsExpanded(true)}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: 24,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          {isPlaying ? <AnimatedBars /> : <span style={{ fontSize: 16 }}>🎵</span>}
          <span style={{ fontSize: 12, color: isPlaying ? "var(--accent-blue)" : "var(--text-muted)" }}>
            {isPlaying ? currentSound.label : "Ambient"}
          </span>
        </div>
      ) : (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: 16,
            width: 240,
            overflow: "hidden",
            boxShadow: isDragging
              ? "0 20px 60px rgba(0,0,0,0.6)"
              : "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div
            onMouseDown={startDrag}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "10px 12px",
              borderBottom: "1px solid var(--border-default)",
              background: "var(--bg-elevated)",
              cursor: isDragging ? "grabbing" : "grab",
              userSelect: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                aria-hidden="true"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 4px)",
                  gridTemplateRows: "repeat(2, 4px)",
                  gap: 3,
                  opacity: 0.8,
                }}
              >
                {Array.from({ length: 6 }).map((_, index) => (
                  <span
                    key={`ambient-grip-${index}`}
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "var(--text-secondary)",
                    }}
                  />
                ))}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Ambient Sounds</span>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              style={{
                border: "1px solid var(--border-default)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                width: 24,
                height: 24,
                borderRadius: 7,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                fontSize: 16,
              }}
            >
              −
            </button>
          </div>

          <div style={{ padding: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {sounds.map((sound) => {
                const selected = mixMode ? activeSounds.has(sound.id) : currentSoundId === sound.id;
                return (
                  <button
                    key={sound.id}
                    type="button"
                    onClick={() => void handleSoundSelect(sound.id)}
                    style={{
                      background: selected ? `${sound.color}20` : "var(--bg-elevated)",
                      border: selected ? `1px solid ${sound.color}` : "1px solid var(--border-default)",
                      borderRadius: 10,
                      padding: "10px 8px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "grid",
                      gap: 4,
                      justifyItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{sound.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>{sound.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => void togglePlay()}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: isPlaying ? "1px solid transparent" : "1px solid var(--accent-blue)",
                  background: isPlaying ? "var(--accent-blue)" : "var(--bg-elevated)",
                }}
              >
                {isPlaying ? (
                  <span style={{ display: "flex", gap: 4 }}>
                    <span style={{ width: 4, height: 16, borderRadius: 2, background: "white" }} />
                    <span style={{ width: 4, height: 16, borderRadius: 2, background: "white" }} />
                  </span>
                ) : (
                  <span
                    style={{
                      width: 0,
                      height: 0,
                      borderTop: "8px solid transparent",
                      borderBottom: "8px solid transparent",
                      borderLeft: "12px solid var(--accent-blue)",
                      marginLeft: 2,
                    }}
                  />
                )}
              </button>
            </div>

            <div style={{ padding: "12px 4px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Volume</span>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(event) => setVolume(parseFloat(event.target.value))}
                style={{ width: "100%", accentColor: "var(--accent-blue)", cursor: "pointer" }}
              />
            </div>

            <label
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={mixMode}
                onChange={(event) => setMixMode(event.target.checked)}
              />
              Mix sounds
            </label>
          </div>
        </div>
      )}

      <style>{`
        @keyframes sound-bar {
          0%, 100% { height: 4px; }
          50% { height: 14px; }
        }
      `}</style>
    </div>
  );
}
