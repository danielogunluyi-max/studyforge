"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "./_components/app-nav";

type StatItem = {
  icon: string;
  label: string;
  value: number;
  suffix: string;
};

const typingWords = ["Summaries", "Flashcards", "Practice Quizzes", "Exam Predictions"];

const stats: StatItem[] = [
  { icon: "📚", label: "Notes Generated", value: 10000, suffix: "+" },
  { icon: "⚡", label: "Battles Fought", value: 500, suffix: "+" },
  { icon: "🎯", label: "Exam Success Rate", value: 95, suffix: "%" },
  { icon: "🌍", label: "Countries", value: 50, suffix: "+" },
];

const featureCards = [
  {
    emoji: "🧠",
    title: "AI Exam Predictor",
    description: "Upload past exams and get likely question predictions with confidence scoring.",
    href: "/exam-predictor",
    cta: "Try Predictor →",
    bg: "from-violet-500/20 via-indigo-500/20 to-blue-500/20",
  },
  {
    emoji: "⚔️",
    title: "Study Battle Arena",
    description: "Challenge friends in fast quiz battles generated from your own study content.",
    href: "/battle",
    cta: "Start Battle →",
    bg: "from-fuchsia-500/20 via-rose-500/20 to-orange-500/20",
  },
  {
    emoji: "🧩",
    title: "Learning Style Quiz",
    description: "Find your learning style and tailor formats that match how you retain information.",
    href: "/learning-style-quiz",
    cta: "Take Quiz →",
    bg: "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
  },
  {
    emoji: "👥",
    title: "AI Study Groups",
    description: "Join collaborative sessions where AI helps moderate, challenge, and explain concepts.",
    href: "/study-groups",
    cta: "Join Groups →",
    bg: "from-amber-500/20 via-orange-500/20 to-red-500/20",
  },
  {
    emoji: "🕸️",
    title: "Concept Web Builder",
    description: "Visualize hidden relationships across topics and discover weak links instantly.",
    href: "/concept-web",
    cta: "Build Web →",
    bg: "from-blue-500/20 via-sky-500/20 to-indigo-500/20",
  },
  {
    emoji: "📎",
    title: "Citation Assistant",
    description: "Generate citations quickly and keep your work clean, consistent, and academic-ready.",
    href: "/citations",
    cta: "Open Citations →",
    bg: "from-slate-500/20 via-zinc-500/20 to-stone-500/20",
  },
];

const testimonials = [
  {
    quote: "StudyForge helped me go from a C to an A in Biology.",
    author: "Sarah",
    meta: "Grade 11",
    initials: "SG",
  },
  {
    quote: "The AI Exam Predictor is scary accurate.",
    author: "Marcus",
    meta: "University Student",
    initials: "MU",
  },
  {
    quote: "Battle Arena makes studying actually fun.",
    author: "Priya",
    meta: "Grade 12",
    initials: "PG",
  },
];

export default function Home() {
  const [typedText, setTypedText] = useState(typingWords[0] ?? "");
  const [typingIndex, setTypingIndex] = useState(0);
  const [typingCharIndex, setTypingCharIndex] = useState((typingWords[0] ?? "").length);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statValues, setStatValues] = useState(stats.map(() => 0));

  const statsRef = useRef<HTMLDivElement | null>(null);
  const [statsInView, setStatsInView] = useState(false);

  const heroPreviewLines = useMemo(
    () => [
      "Topic: Photosynthesis",
      "• Light-dependent reactions happen in the thylakoid membranes.",
      "• ATP + NADPH are produced for the Calvin cycle.",
      "• Chlorophyll absorbs blue/red light most efficiently.",
      "Quick quiz: Why does chlorophyll appear green?",
    ],
    [],
  );

  useEffect(() => {
    const currentWord = typingWords[typingIndex] ?? "";
    const typingDelay = isDeleting ? 45 : 85;

    const timer = window.setTimeout(() => {
      if (!isDeleting && typingCharIndex < currentWord.length) {
        const nextIndex = typingCharIndex + 1;
        setTypingCharIndex(nextIndex);
        setTypedText(currentWord.slice(0, nextIndex));
        return;
      }

      if (!isDeleting && typingCharIndex === currentWord.length) {
        const holdTimer = window.setTimeout(() => setIsDeleting(true), 1000);
        return () => window.clearTimeout(holdTimer);
      }

      if (isDeleting && typingCharIndex > 0) {
        const nextIndex = typingCharIndex - 1;
        setTypingCharIndex(nextIndex);
        setTypedText(currentWord.slice(0, nextIndex));
        return;
      }

      const nextWordIndex = (typingIndex + 1) % typingWords.length;
      setIsDeleting(false);
      setTypingIndex(nextWordIndex);
      setTypingCharIndex(0);
      setTypedText("");
    }, typingDelay);

    return () => window.clearTimeout(timer);
  }, [typingCharIndex, typingIndex, isDeleting]);

  useEffect(() => {
    const statsNode = statsRef.current;
    if (!statsNode) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setStatsInView(true);
      },
      { threshold: 0.3 },
    );

    observer.observe(statsNode);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!statsInView) return;

    const duration = 1400;
    const start = performance.now();
    let frame = 0;

    const animate = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setStatValues(stats.map((item) => Math.floor(item.value * eased)));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [statsInView]);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal='true']"));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <AppNav />

      <section className="relative overflow-hidden bg-gradient-to-br from-[#07102a] via-[#0f1737] to-[#2a1243]">
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute -left-20 top-8 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div className="reveal-on-scroll" data-reveal="true">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/90">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">🔥 Free for students</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">⚡ Powered by AI</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">🎯 Exam Ready</span>
            </div>

            <h1 className="hero-intro text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
              Study smarter with
              <span className="bg-gradient-to-r from-sky-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent"> AI-powered </span>
              tools built for
              <span className="bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent"> real exams</span>
            </h1>

            <p className="mt-5 text-lg text-slate-200 sm:text-xl">
              Generate <span className="font-semibold text-white">{typedText}</span>
              <span className="ml-1 inline-block h-5 w-[2px] animate-pulse bg-violet-200 align-middle" /> in seconds from your notes.
            </p>

            <p className="mt-4 max-w-xl text-sm text-slate-300 sm:text-base">
              Turn lecture material into study formats that actually help you retain and perform under pressure.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/generator" className="rounded-xl bg-white px-6 py-3 text-center text-sm font-bold text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-white/20">
                Paste Text →
              </Link>
              <Link href="/upload" className="rounded-xl border border-white/40 bg-white/10 px-6 py-3 text-center text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20">
                Upload File →
              </Link>
              <Link href="/signup" className="rounded-xl border border-white/30 px-6 py-3 text-center text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/10">
                Create Account
              </Link>
            </div>
          </div>

          <div className="reveal-on-scroll relative" data-reveal="true">
            <div className="absolute -left-6 top-8 rounded-full border border-cyan-300/40 bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-100">
              Live Demo Preview
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">AI Generated Note</p>
                <span className="rounded-full bg-emerald-400/20 px-2 py-1 text-[11px] font-semibold text-emerald-200">Ready</span>
              </div>
              <div className="space-y-2 rounded-xl border border-white/15 bg-[#0a122d]/70 p-4 text-sm text-slate-100">
                {heroPreviewLines.map((line, index) => (
                  <p key={line} className="preview-line" style={{ animationDelay: `${index * 140}ms` }}>
                    {line}
                  </p>
                ))}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link href="/generator" className="rounded-lg bg-violet-500 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-violet-400">
                  Open Generator
                </Link>
                <Link href="/tutor" className="rounded-lg border border-violet-300/40 bg-violet-500/10 px-3 py-2 text-center text-xs font-semibold text-violet-100 transition hover:bg-violet-500/20">
                  Ask Nova Tutor
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={statsRef} className="border-b border-gray-200 bg-white py-8">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {stats.map((item, index) => (
            <div key={item.label} className="reveal-on-scroll rounded-xl border border-gray-200 bg-gray-50 p-4 text-center shadow-sm" data-reveal="true">
              <p className="text-xl">{item.icon}</p>
              <p className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
                {statValues[index].toLocaleString()}
                {item.suffix}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="reveal-on-scroll mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20" data-reveal="true">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">How it works</h2>
          <p className="mt-3 text-gray-600">A fast 3-step workflow to turn raw notes into confident exam prep.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: "📄", title: "Step 1", desc: "Paste your notes or upload a file" },
            { icon: "🛠️", title: "Step 2", desc: "Choose your study format" },
            { icon: "🏆", title: "Step 3", desc: "Ace your exam" },
          ].map((step, index) => (
            <div key={step.title} className="relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              {index < 2 && <span className="absolute -right-3 top-1/2 hidden h-[2px] w-6 bg-gradient-to-r from-blue-400 to-purple-400 md:block" />}
              <div className="mb-3 text-3xl">{step.icon}</div>
              <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#060a1a] py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="reveal-on-scroll mb-12 text-center" data-reveal="true">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Unique features built for modern students</h2>
            <p className="mt-3 text-slate-300">Explore tools that make StudyForge feel like a complete exam-prep operating system.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((feature) => (
              <div key={feature.title} className={`reveal-on-scroll rounded-2xl border border-white/10 bg-gradient-to-br ${feature.bg} p-6 shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/40`} data-reveal="true">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl backdrop-blur-sm animate-[float_4s_ease-in-out_infinite]">
                  {feature.emoji}
                </div>
                <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-200">{feature.description}</p>
                <Link href={feature.href} className="mt-5 inline-flex text-sm font-semibold text-white transition hover:text-blue-200 hover:underline">
                  {feature.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="reveal-on-scroll mb-12 text-center" data-reveal="true">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Students are seeing real results</h2>
            <p className="mt-3 text-gray-600">Social proof from learners using StudyForge every week.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((item) => (
              <div key={item.author} className="reveal-on-scroll rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg" data-reveal="true">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
                    {item.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.author}</p>
                    <p className="text-xs text-gray-500">{item.meta}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-gray-700">“{item.quote}”</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-[#0b1024] via-[#140f33] to-[#1b0f3f] py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div className="reveal-on-scroll" data-reveal="true">
            <p className="inline-block rounded-full border border-purple-300/30 bg-purple-500/15 px-3 py-1 text-xs font-semibold text-purple-100">Nova AI Tutor</p>
            <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Your personal AI tutor, available any time</h2>
            <p className="mt-3 text-slate-200">
              Ask Nova to explain concepts, test your understanding, and guide your revision with calm, step-by-step support.
            </p>
            <Link href="/tutor" className="mt-6 inline-flex rounded-xl bg-purple-500 px-5 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-purple-400 hover:shadow-xl hover:shadow-purple-700/40">
              Chat with Nova →
            </Link>
          </div>

          <div className="reveal-on-scroll rounded-2xl border border-purple-300/25 bg-[#0e1637]/80 p-5 shadow-2xl" data-reveal="true">
            <div className="space-y-3 text-sm">
              <div className="max-w-[88%] rounded-xl border border-slate-600 bg-[#121f46] px-4 py-3 text-slate-100">
                How do I remember the Krebs cycle quickly?
              </div>
              <div className="ml-auto max-w-[88%] rounded-xl bg-purple-600 px-4 py-3 text-white">
                Use a memory chain: Acetyl-CoA → Citrate → Isocitrate → α-Ketoglutarate → Succinyl-CoA → Succinate → Fumarate → Malate. I can quiz you now.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="reveal-on-scroll mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 sm:py-20" data-reveal="true">
        <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Ready to study smarter?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-gray-600">Join students using StudyForge to convert notes into focused prep, stronger confidence, and better results.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/generator" className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg">
            Start with Generator
          </Link>
          <Link href="/upload" className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-bold text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-lg">
            Upload a File
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-[#060a1a] py-10">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-3 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <img src="/StudyForge-logo.png" alt="StudyForge" className="h-8 w-8" />
              <p className="text-lg font-bold text-white">StudyForge</p>
            </div>
            <p className="mt-3 text-sm text-slate-300">AI study tools that help you learn faster and perform better.</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Built by students, for students</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Links</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-300">
              <Link href="/exam-predictor" className="transition hover:text-white">Features</Link>
              <Link href="/generator" className="transition hover:text-white">Generator</Link>
              <Link href="/citations" className="transition hover:text-white">Citations</Link>
              <Link href="/battle" className="transition hover:text-white">Battle Arena</Link>
              <Link href="/tutor" className="transition hover:text-white">Nova Tutor</Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Social</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: "X", href: "#" },
                { label: "Discord", href: "#" },
                { label: "Instagram", href: "#" },
              ].map((item) => (
                <a key={item.label} href={item.href} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/40 hover:text-white">
                  {item.label}
                </a>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-400">© 2026 StudyForge</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .hero-intro {
          animation: heroEnter 720ms ease-out both;
        }

        .preview-line {
          opacity: 0;
          animation: lineIn 560ms ease-out forwards;
        }

        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 520ms ease, transform 520ms ease;
        }

        .reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes heroEnter {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes lineIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </main>
  );
}