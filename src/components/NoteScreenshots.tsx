'use client';

import { useState, useEffect } from 'react';

interface Screenshot {
  id: string;
  title: string;
  subject: string;
  imageData: string;
  createdAt: string;
}

interface NoteScreenshotsProps {
  noteId: string;
  className?: string;
}

export default function NoteScreenshots({ noteId, className = '' }: NoteScreenshotsProps) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);

  useEffect(() => {
    loadNoteScreenshots();
  }, [noteId]);

  const loadNoteScreenshots = async () => {
    try {
      // First get all screenshots linked to this note
      const response = await fetch(`/api/screenshots?noteId=${noteId}`);
      if (response.ok) {
        const data = await response.json();
        setScreenshots(data);
      }
    } catch (error) {
      console.error('Error loading note screenshots:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="flex space-x-2">
          <div className="w-20 h-20 bg-gray-200 rounded"></div>
          <div className="w-20 h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (screenshots.length === 0) {
    return null;
  }

  return (
    <>
      <div className={className}>
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <span>📎 Attached Screenshots</span>
          <span className="text-xs text-gray-500">({screenshots.length})</span>
        </h4>

        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {screenshots.map((screenshot) => (
            <div
              key={screenshot.id}
              onClick={() => setSelectedScreenshot(screenshot)}
              className="aspect-square cursor-pointer border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
              title={screenshot.title}
            >
              <img
                src={screenshot.imageData}
                alt={screenshot.title}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div
            className="max-w-4xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedScreenshot.title}</h3>
                <p className="text-sm text-gray-600">{selectedScreenshot.subject}</p>
              </div>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <img
                src={selectedScreenshot.imageData}
                alt={selectedScreenshot.title}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}