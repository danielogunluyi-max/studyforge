"use client";

/**
 * Next-Gen Flashcard Deck Component
 * --------------------------------
 * Premium, hardware-accelerated card interface with 3D flip animation.
 * Matches Midnight Glass theme with smooth transitions and navigation.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCw, Layers, XCircle, CheckCircle, RotateCcw } from "lucide-react";

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
  // Initialize active queue with original flashcards
  const [activeQueue, setActiveQueue] = useState<Flashcard[]>(flashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCardIds, setMasteredCardIds] = useState<Set<number>>(new Set());
  const [reviewCount, setReviewCount] = useState(0);
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [feedbackFlash, setFeedbackFlash] = useState<'success' | 'review' | null>(null);

  // Reset state when flashcards prop changes
  useEffect(() => {
    setActiveQueue(flashcards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredCardIds(new Set());
    setReviewCount(0);
    setFirstTryCount(0);
    setSessionComplete(false);
    setFeedbackFlash(null);
  }, [flashcards]);

  if (flashcards.length === 0) {
    return (
      <div className={`bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 ${className}`}>
        <div className="text-center text-zinc-400">No flashcards available</div>
      </div>
    );
  }

  const currentCard = activeQueue[currentIndex];
  const progress = sessionComplete ? "Complete" : `${currentIndex + 1} of ${activeQueue.length}`;
  const masteredCount = masteredCardIds.size;

  // Get original index of current card for tracking
  const getCurrentCardOriginalIndex = useCallback(() => {
    return flashcards.findIndex(f => f.front === currentCard?.front && f.back === currentCard?.back);
  }, [flashcards, currentCard]);

  const handleReviewLater = useCallback(() => {
    if (!currentCard || sessionComplete) return;

    const originalIndex = getCurrentCardOriginalIndex();
    if (originalIndex === -1) return;

    // Trigger amber feedback flash
    setFeedbackFlash('review');
    setTimeout(() => setFeedbackFlash(null), 600);

    // Push card to end of queue
    setActiveQueue(prev => {
      const newQueue = [...prev];
      const cardToMove = newQueue.splice(currentIndex, 1)[0];
      if (cardToMove) {
        newQueue.push(cardToMove);
      }
      return newQueue;
    });

    // Increment review count
    setReviewCount(prev => prev + 1);

    // Reset flip and stay at same index (now next card)
    setIsFlipped(false);
  }, [currentCard, sessionComplete, getCurrentCardOriginalIndex]);

  const handleGotIt = useCallback(() => {
    if (!currentCard || sessionComplete) return;

    const originalIndex = getCurrentCardOriginalIndex();
    if (originalIndex === -1) return;

    // Trigger cyan success flash
    setFeedbackFlash('success');
    setTimeout(() => setFeedbackFlash(null), 600);

    // Mark as mastered
    setMasteredCardIds(prev => new Set([...prev, originalIndex]));
    setFirstTryCount(prev => prev + 1);

    // Remove from active queue
    setActiveQueue(prev => {
      const newQueue = [...prev];
      newQueue.splice(currentIndex, 1);
      return newQueue;
    });

    // Reset flip
    setIsFlipped(false);

    // Check if session complete
    if (activeQueue.length === 1) {
      setSessionComplete(true);
    }
  }, [currentCard, sessionComplete, getCurrentCardOriginalIndex, activeQueue.length]);

  const handleRestart = useCallback(() => {
    setActiveQueue(flashcards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredCardIds(new Set());
    setReviewCount(0);
    setFirstTryCount(0);
    setSessionComplete(false);
    setFeedbackFlash(null);
  }, [flashcards]);

  const handleNext = () => {
    if (currentIndex < activeQueue.length - 1) {
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
    setCurrentIndex(Math.floor(Math.random() * activeQueue.length));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sessionComplete) {
        if (e.key === 'Enter' || e.key === ' ') {
          handleRestart();
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleReviewLater();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleGotIt();
      } else if (e.key === ' ') {
        e.preventDefault();
        handleFlip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionComplete, handleReviewLater, handleGotIt, handleFlip, handleRestart]);

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
              {/* Visual Feedback Overlay */}
              <AnimatePresence>
                {feedbackFlash && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`absolute inset-0 rounded-2xl pointer-events-none ${
                      feedbackFlash === 'success'
                        ? 'bg-cyan-400/20 shadow-[0_0_60px_-20px_rgba(34,211,238,0.6)]'
                        : 'bg-amber-400/20 shadow-[0_0_60px_-20px_rgba(251,191,36,0.6)]'
                    }`}
                    style={{ backfaceVisibility: 'hidden' }}
                  />
                )}
              </AnimatePresence>

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
                  <p className="text-xl font-semibold text-white leading-relaxed">{currentCard?.front}</p>
                </div>
              </motion.div>

              {/* Back Side with Action Buttons */}
              <motion.div
                className="absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br from-cyan-900/80 to-slate-900/80 border border-cyan-500/20 p-8 flex flex-col items-center justify-center"
                style={{ 
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)"
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={`back-${currentIndex}`}
              >
                <div className="text-center flex-1 flex flex-col justify-center">
                  <p className="text-sm font-medium text-cyan-300 mb-3 uppercase tracking-wider">Back</p>
                  <p className="text-xl font-semibold text-white leading-relaxed mb-6">{currentCard?.back}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReviewLater();
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all text-sm font-medium"
                  >
                    <XCircle size={16} />
                    Review Later
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGotIt();
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all text-sm font-medium shadow-[0_0_20px_-4px_rgba(34,211,238,0.3)]"
                  >
                    <CheckCircle size={16} />
                    Got It!
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Session Completion Screen */}
      <AnimatePresence>
        {sessionComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-cyan-500/30 p-8 flex flex-col items-center justify-center text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-500/40 mb-4">
              <CheckCircle size={32} className="text-cyan-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Deck Mastered!</h3>
            <p className="text-zinc-400 mb-6">You've completed this study session.</p>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-2xl font-bold text-cyan-400">{firstTryCount}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">First Try</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-2xl font-bold text-amber-400">{reviewCount}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Reviewed</p>
              </div>
            </div>

            <button
              onClick={handleRestart}
              className="px-6 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 transition-all flex items-center gap-2"
            >
              <RotateCcw size={18} />
              Restart Deck
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Controls */}
      {!sessionComplete && (
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
            disabled={currentIndex === activeQueue.length - 1}
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {!sessionComplete && (
        <div className="mt-6">
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / activeQueue.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Keyboard Hints */}
      <div className="mt-4 text-center">
        {sessionComplete ? (
          <p className="text-xs text-zinc-500">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">Enter</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">Space</kbd> to restart
          </p>
        ) : (
          <p className="text-xs text-zinc-500">
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">←</kbd> Review Later · <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">→</kbd> Got It · <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">Space</kbd> Flip
          </p>
        )}
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
