"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "./_components/app-nav";

type StatItem = {
  icon: IconName;
  label: string;
  value: number;
  suffix: string;
};

type IconName =
  | "flame"
  | "bolt"
  | "target"
  | "brain"
  | "swords"
  | "puzzle"
  | "group"
  | "network"
  | "book"
  | "sparkle"
  | "doc"
  | "sliders"
  | "cap"
  | "docs"
  | "shield"
  | "trend"
  | "globe";

const typingWords = ["Summaries", "Flashcards", "Practice Quizzes", "Exam Predictions"];

const stats: StatItem[] = [
  { icon: "docs", label: "Notes Generated", value: 10000, suffix: "+" },
  { icon: "shield", label: "Battles Fought", value: 500, suffix: "+" },
  { icon: "trend", label: "Exam Success Rate", value: 95, suffix: "%" },
  { icon: "globe", label: "Countries", value: 50, suffix: "+" },
];

const featureCards = [
  {
    icon: "brain" as IconName,
    title: "AI Exam Predictor",
    description: "Upload past exams and get likely question predictions with confidence scoring.",
    href: "/exam-predictor",
    cta: "Try Predictor →",
    bg: "from-violet-500/20 via-indigo-500/20 to-blue-500/20",
  },
  {
    icon: "swords" as IconName,
    title: "Study Battle Arena",
    description: "Challenge friends in fast quiz battles generated from your own study content.",
    href: "/battle",
    cta: "Start Battle →",
    bg: "from-fuchsia-500/20 via-rose-500/20 to-orange-500/20",
  },
  {
    icon: "puzzle" as IconName,
    title: "Learning Style Quiz",
    description: "Find your learning style and tailor formats that match how you retain information.",
    href: "/learning-style-quiz",
    cta: "Take Quiz →",
    bg: "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
  },
  {
    icon: "group" as IconName,
    title: "AI Study Groups",
    description: "Join collaborative sessions where AI helps moderate, challenge, and explain concepts.",
    href: "/study-groups",
    cta: "Join Groups →",
    bg: "from-amber-500/20 via-orange-500/20 to-red-500/20",
  },
  {
    icon: "network" as IconName,
    title: "Concept Web Builder",
    description: "Visualize hidden relationships across topics and discover weak links instantly.",
    href: "/concept-web",
    cta: "Build Web →",
    bg: "from-blue-500/20 via-sky-500/20 to-indigo-500/20",
  },
  {
    icon: "book" as IconName,
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
    subject: "Biology",
    initials: "SG",
  },
  {
    quote: "The AI Exam Predictor is scary accurate.",
    author: "Marcus",
    meta: "University Student",
    subject: "Computer Science",
    initials: "MU",
  },
  {
    quote: "Battle Arena makes studying actually fun.",
    author: "Priya",
    meta: "Grade 12",
    subject: "Chemistry",
    initials: "PG",
  },
];

function Icon({ name, size = 24, className = "" }: { name: IconName; size?: number; className?: string }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "flame":
      return <svg {...props}><path d="M12 3.75c.8 2.65-.4 4.25-2.1 6.1-1.5 1.65-2.9 3.05-2.9 5.1a5 5 0 0010 0c0-2.7-1.95-4.65-3.4-6.4-.9-1.1-1.7-2.1-1.6-4.8Z" /></svg>;
    case "bolt":
      return <svg {...props}><path d="M13.5 2.25 5.25 13.5h5.25l-1.5 8.25 8.25-11.25h-5.25l1.5-8.25Z" /></svg>;
    case "target":
      return <svg {...props}><circle cx="12" cy="12" r="8.25" /><circle cx="12" cy="12" r="4.25" /><circle cx="12" cy="12" r="1.25" /></svg>;
    case "brain":
      return <svg {...props}><path d="M9 4.5a3 3 0 016 0v.4a2.75 2.75 0 012.25 2.7v.9a2.5 2.5 0 011.5 2.3 2.5 2.5 0 01-1.5 2.3v.9a2.75 2.75 0 01-2.25 2.7v.4a3 3 0 01-6 0v-.4A2.75 2.75 0 016.75 14v-.9a2.5 2.5 0 01-1.5-2.3 2.5 2.5 0 011.5-2.3v-.9A2.75 2.75 0 019 4.9v-.4Z" /><path d="M12 6v12M9 9.5c.8.3 1.5.8 2 1.5M15 9.5c-.8.3-1.5.8-2 1.5" /></svg>;
    case "swords":
      return <svg {...props}><path d="m7 5 5 5M5.5 7.5 9 4M4 9l4-4M17 5l-5 5m6.5-2.5L15 4m5 5-4-4M9 15l-5 5m7-3.5L7.5 20M8 21l4-4M15 15l5 5m-7-3.5 3.5 3.5M16 21l-4-4" /></svg>;
    case "puzzle":
      return <svg {...props}><path d="M8.25 4.5A1.75 1.75 0 0110 2.75h2A1.75 1.75 0 0113.75 4.5v.75h2.75A1.75 1.75 0 0118.25 7v2.75h.75a1.75 1.75 0 010 3.5h-.75V16A1.75 1.75 0 0116.5 17.75h-2.75v.75A1.75 1.75 0 0112 20.25h-2a1.75 1.75 0 01-1.75-1.75v-.75H5.5A1.75 1.75 0 013.75 16v-2.75H3a1.75 1.75 0 010-3.5h.75V7A1.75 1.75 0 015.5 5.25h2.75V4.5Z" /></svg>;
    case "group":
      return <svg {...props}><path d="M16.5 18.75v-1.5a3.75 3.75 0 00-7.5 0v1.5M20.25 18.75v-1.5a3 3 0 00-4.5-2.598M3.75 18.75v-1.5a3 3 0 014.5-2.598M12.75 9.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0ZM19.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0Zm-12 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0Z" /></svg>;
    case "network":
      return <svg {...props}><circle cx="5" cy="12" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="19" cy="12" r="2" /><circle cx="12" cy="19" r="2" /><path d="M6.7 10.9 10.3 6.1M13.7 6.1l3.6 4.8M17.3 13.1 13.7 17.9M10.3 17.9 6.7 13.1" /></svg>;
    case "book":
      return <svg {...props}><path d="M4.5 5.25A2.25 2.25 0 016.75 3h10.5v16.5H6.75A2.25 2.25 0 014.5 17.25V5.25Z" /><path d="M7.5 6.75h6M7.5 10.5h7.5M7.5 14.25h5.25" /></svg>;
    case "sparkle":
      return <svg {...props}><path d="m12 3 1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3ZM18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1ZM5.5 13l1.1 2.4L9 16.5l-2.4 1.1L5.5 20l-1.1-2.4L2 16.5l2.4-1.1L5.5 13Z" /></svg>;
    case "doc":
      return <svg {...props}><path d="M7.5 3.75h6L18 8.25v12H7.5a2.25 2.25 0 01-2.25-2.25V6A2.25 2.25 0 017.5 3.75Z" /><path d="M13.5 3.75V8.25H18M8.25 11.25h7.5M8.25 14.25h7.5M8.25 17.25h5.25" /></svg>;
    case "sliders":
      return <svg {...props}><path d="M4.5 6.75h15M4.5 12h15M4.5 17.25h15M8.25 5.25v3M15.75 10.5v3M11.25 15.75v3" /></svg>;
    case "cap":
      return <svg {...props}><path d="M3 9.75 12 5l9 4.75L12 14.5 3 9.75Z" /><path d="M7.5 12.25v3.5c0 1.5 2 2.75 4.5 2.75s4.5-1.25 4.5-2.75v-3.5" /><path d="M21 10.5v4.5" /></svg>;
    case "docs":
      return <svg {...props}><path d="M8.25 4.5h9a1.5 1.5 0 011.5 1.5V18a1.5 1.5 0 01-1.5 1.5h-9a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5Z" /><path d="M5.25 7.5h-1.5A1.5 1.5 0 002.25 9v10.5A1.5 1.5 0 003.75 21h9a1.5 1.5 0 001.5-1.5V18" /></svg>;
    case "shield":
      return <svg {...props}><path d="M12 3.75 5.25 6v5.25c0 4.2 2.8 7.95 6.75 9 3.95-1.05 6.75-4.8 6.75-9V6L12 3.75Z" /></svg>;
    case "trend":
      return <svg {...props}><path d="M3.75 17.25h16.5M6 14.25l3.75-3.75 3 3 4.5-5.25" /><path d="M15.75 8.25H20.25V12.75" /></svg>;
    case "globe":
      return <svg {...props}><circle cx="12" cy="12" r="8.25" /><path d="M3.9 9h16.2M3.9 15h16.2M12 3.9c2.2 2.4 3.4 5.1 3.4 8.1 0 3-1.2 5.7-3.4 8.1M12 3.9c-2.2 2.4-3.4 5.1-3.4 8.1 0 3 1.2 5.7 3.4 8.1" /></svg>;
    default:
      return null;
  }
}

export default function Home() {
  const [typedText, setTypedText] = useState(typingWords[0] ?? "");
  const [typingIndex, setTypingIndex] = useState(0);
  const [typingCharIndex, setTypingCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statValues, setStatValues] = useState(stats.map(() => 0));

  const statsRef = useRef<HTMLDivElement | null>(null);
  const [statsInView, setStatsInView] = useState(false);
  const animatedWord = typedText;

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

    const duration = 2000;
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

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div className="reveal-on-scroll" data-reveal="true">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/90">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1"><Icon name="flame" size={20} />Free for students</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1"><Icon name="bolt" size={20} />Powered by AI</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1"><Icon name="target" size={20} />Exam Ready</span>
            </div>

            <h1 className="text-5xl font-bold text-white leading-tight">
              Study smarter with<br />
              AI-powered tools<br />
              built for real exams
            </h1>

            <p className="text-lg text-gray-300 mt-4">
              Generate <span className="text-blue-400 font-semibold">{animatedWord}</span> in seconds from your notes.
            </p>

            <p className="mt-4 max-w-xl text-sm text-slate-300 sm:text-base">
              Turn lecture material into study formats that actually help you retain and perform under pressure.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/generator" className="rounded-xl bg-blue-600 px-6 py-3 text-center text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-900/40">
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

          <div className="reveal-on-scroll" data-reveal="true">
            <div className="mb-3 inline-flex rounded-full border border-cyan-300/40 bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-100">
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

      <section ref={statsRef} className="border-b border-gray-200 bg-white py-20">
        <div className="stagger-grid mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {stats.map((item, index) => (
            <div key={item.label} className="stagger-card reveal-on-scroll rounded-xl border border-gray-200 bg-gray-50 p-4 text-center shadow-sm" data-reveal="true">
              <div className="mx-auto w-fit text-blue-600"><Icon name={item.icon} size={24} /></div>
              <p className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
                {statValues[index].toLocaleString()}
                {item.suffix}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="reveal-on-scroll mx-auto max-w-7xl px-4 py-20 sm:px-6" data-reveal="true">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">How it works</h2>
          <p className="mt-3 text-gray-600">A fast 3-step workflow to turn raw notes into confident exam prep.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: "doc" as IconName,
              title: "Step 1",
              number: "01",
              desc: "Paste your lecture notes, textbook paragraphs, or upload a PDF or image. StudyForge extracts and reads your content instantly.",
              accent: "border-blue-500",
              numberColor: "text-blue-600",
            },
            {
              icon: "sliders" as IconName,
              title: "Step 2",
              number: "02",
              desc: "Pick from summaries, flashcards, practice quizzes, or detailed notes. Customize length, difficulty, and format to match your needs.",
              accent: "border-purple-500",
              numberColor: "text-purple-600",
            },
            {
              icon: "cap" as IconName,
              title: "Step 3",
              number: "03",
              desc: "Use predicted exam questions, battle friends, or chat with Nova to reinforce your knowledge and walk into every exam confident.",
              accent: "border-green-500",
              numberColor: "text-green-600",
            },
          ].map((step, index) => (
            <div key={step.title} className={`relative rounded-xl border border-gray-200 border-l-4 ${step.accent} bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg`}>
              {index < 2 && <span className="absolute -right-5 top-1/2 hidden -translate-y-1/2 text-2xl font-bold text-blue-500 md:block">→</span>}
              <span className={`absolute right-4 top-4 text-3xl font-extrabold ${step.numberColor}`}>{step.number}</span>
              <div className="mb-3 text-blue-600"><Icon name={step.icon} size={32} /></div>
              <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#060a1a] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="reveal-on-scroll mb-12 text-center" data-reveal="true">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Unique features built for modern students</h2>
            <p className="mt-3 text-slate-300">Explore tools that make StudyForge feel like a complete exam-prep operating system.</p>
          </div>

          <div className="stagger-grid grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((feature) => (
              <div key={feature.title} className={`stagger-card feature-tilt reveal-on-scroll rounded-2xl border border-white/10 bg-gradient-to-br ${feature.bg} p-6 shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/40`} data-reveal="true">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm animate-[float_4s_ease-in-out_infinite]">
                  <Icon name={feature.icon} size={28} />
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

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="reveal-on-scroll mb-12 text-center" data-reveal="true">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Students are seeing real results</h2>
            <p className="mt-3 text-gray-600">Social proof from learners using StudyForge every week.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((item) => (
              <div key={item.author} className="reveal-on-scroll rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg" data-reveal="true">
                <p className="mb-2 text-5xl font-bold leading-none text-blue-500">&ldquo;</p>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
                    {item.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.author}</p>
                    <p className="text-xs text-gray-500">{item.meta} • {item.subject}</p>
                  </div>
                </div>
                <p className="mb-3 text-sm text-amber-500">⭐⭐⭐⭐⭐</p>
                <p className="border-b border-blue-200 pb-3 text-lg italic leading-relaxed text-gray-700">{item.quote}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-[#0b1024] via-[#140f33] to-[#1b0f3f] py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div className="reveal-on-scroll" data-reveal="true">
            <p className="inline-flex items-center gap-2 rounded-full border border-purple-300/30 bg-purple-500/15 px-3 py-1 text-xs font-semibold text-purple-100"><Icon name="sparkle" size={20} />Nova AI Tutor</p>
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

      <section className="reveal-on-scroll relative overflow-hidden bg-gradient-to-br from-[#07102a] via-[#0f1737] to-[#2a1243]" data-reveal="true">
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute left-1/3 top-10 h-56 w-56 rounded-full bg-blue-500/25 blur-3xl" />
          <div className="absolute right-1/4 bottom-8 h-56 w-56 rounded-full bg-purple-500/25 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to study smarter?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-200">Join students using StudyForge to convert notes into focused prep, stronger confidence, and better results.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/generator" className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg">
              Start with Generator
            </Link>
            <Link href="/upload" className="rounded-xl border border-white/40 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-lg">
              Upload a File
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-[#060a1a] py-20">
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
              <a href="#" aria-label="X" className="rounded-lg border border-white/20 p-2 text-slate-300 transition hover:border-white/40 hover:text-white">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2H21l-6.56 7.497L22.5 22h-6.31l-4.94-6.39L5.66 22H2.9l7.02-8.02L1.5 2h6.47l4.46 5.82L18.244 2Zm-1.11 18h1.75L6.93 3.9H5.06L17.134 20Z" />
                </svg>
              </a>
              <a href="#" aria-label="Discord" className="rounded-lg border border-white/20 p-2 text-slate-300 transition hover:border-white/40 hover:text-white">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M20.317 4.37A19.79 19.79 0 0 0 15.885 3a13.946 13.946 0 0 0-.678 1.394 18.77 18.77 0 0 0-5.414 0A13.915 13.915 0 0 0 9.115 3a19.736 19.736 0 0 0-4.433 1.371C1.857 8.589 1.09 12.702 1.473 16.757a19.902 19.902 0 0 0 5.432 2.743 14.323 14.323 0 0 0 1.163-1.915 12.94 12.94 0 0 1-1.833-.884c.154-.112.305-.229.452-.35 3.53 1.67 7.358 1.67 10.847 0 .148.121.299.238.452.35a12.87 12.87 0 0 1-1.836.885 14.218 14.218 0 0 0 1.165 1.914 19.876 19.876 0 0 0 5.433-2.743c.448-4.7-.765-8.775-3.21-12.387ZM8.02 14.39c-1.06 0-1.924-.96-1.924-2.14s.85-2.14 1.924-2.14c1.08 0 1.94.96 1.924 2.14 0 1.18-.85 2.14-1.924 2.14Zm7.96 0c-1.06 0-1.924-.96-1.924-2.14s.85-2.14 1.924-2.14c1.08 0 1.94.96 1.924 2.14 0 1.18-.848 2.14-1.924 2.14Z" />
                </svg>
              </a>
              <a href="#" aria-label="Instagram" className="rounded-lg border border-white/20 p-2 text-slate-300 transition hover:border-white/40 hover:text-white">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2ZM7.5 4A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm9.75 1.5a1.25 1.25 0 1 1-1.25 1.25 1.25 1.25 0 0 1 1.25-1.25ZM12 7a5 5 0 1 1-5 5 5 5 0 0 1 5-5Zm0 2a3 3 0 1 0 3 3 3 3 0 0 0-3-3Z" />
                </svg>
              </a>
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

        .feature-tilt {
          transform-style: preserve-3d;
          perspective: 1000px;
        }

        .feature-tilt:hover {
          transform: perspective(1000px) rotateX(2deg) rotateY(-2deg) translateY(-6px);
        }
      `}</style>
    </main>
  );
}