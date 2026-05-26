"use client";

/**
 * Next-Gen Flashcard Deck Component
 * --------------------------------
 * Premium, hardware-accelerated card interface with 3D flip animation.
 * Matches Midnight Glass theme with smooth transitions and navigation.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCw, Layers } from "lucide-react";

type Flashcard = {
  front: string;
  back: string;
};

interface FlashcardDeckProps {
  flashcards: Flashcard[];
  onClose?: () => void;
  className?: string;
}

export default function FlashcardDeck({ flashcards, onClose, className = "" }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (flashcards.length === 0) {
    return (
      <div className={`bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 ${className}`}>
        <div className="text-center text-zinc-400">No flashcards available</div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex]!;
  const progress = `${currentIndex + 1} of ${flashcards.length}`;

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    setCurrentIndex(Math.floor(Math.random() * flashcards.length));
  };

  return (
    <div className={`bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-500/30">
            <Layers size={20} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Flashcard Deck</h3>
            <p className="text-xs text-zinc-400">{progress}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            ×
          </button>
        )}
      </div>

      {/* 3D Card Container */}
      <div className="relative mb-6">
        <div className="aspect-[3/2] w-full max-w-2xl mx-auto">
          <motion.div
            className="relative w-full h-full cursor-pointer"
            style={{ perspective: "1000px" }}
            onClick={handleFlip}
          >
            <motion.div
              className="relative w-full h-full"
              style={{ transformStyle: "preserve-3d" }}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Front Side */}
              <motion.div
                className="absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10 p-8 flex items-center justify-center"
                style={{ backfaceVisibility: "hidden" }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={`front-${currentIndex}`}
              >
                <div className="text-center">
                  <p className="text-sm font-medium text-cyan-400 mb-3 uppercase tracking-wider">Front</p>
                  <p className="text-xl font-semibold text-white leading-relaxed">{currentCard.front}</p>
                </div>
              </motion.div>

              {/* Back Side */}
              <motion.div
                className="absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br from-cyan-900/80 to-slate-900/80 border border-cyan-500/20 p-8 flex items-center justify-center"
                style={{ 
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)"
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={`back-${currentIndex}`}
              >
                <div className="text-center">
                  <p className="text-sm font-medium text-cyan-300 mb-3 uppercase tracking-wider">Back</p>
                  <p className="text-xl font-semibold text-white leading-relaxed">{currentCard.back}</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          onClick={handleFlip}
          className="px-6 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 transition-all flex items-center gap-2"
        >
          <RotateCw size={18} />
          Flip
        </button>

        <button
          onClick={handleShuffle}
          className="p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
          title="Shuffle"
        >
          <Layers size={20} />
        </button>

        <button
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          className="p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mt-6">
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Keyboard Hints */}
      <div className="mt-4 text-center">
        <p className="text-xs text-zinc-500">
          Click card or press <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">Space</kbd> to flip
        </p>
      </div>

      <style jsx>{`
        .backface-hidden {
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
}
