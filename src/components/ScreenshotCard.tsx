'use client';

import { useState } from 'react';

interface Screenshot {
  id: string;
  title: string;
  subject: string;
  imageData: string;
  noteId?: string;
  note?: {
    id: string;
    title: string;
  };
  createdAt: string;
}

interface Note {
  id: string;
  title: string;
}

interface ScreenshotCardProps {
  screenshot: Screenshot;
  notes: Note[];
  onDelete: (id: string) => void;
  onLinkToNote: (screenshotId: string, noteId: string | null) => void;
}

export default function ScreenshotCard({
  screenshot,
  notes,
  onDelete,
  onLinkToNote
}: ScreenshotCardProps) {
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [linking, setLinking] = useState(false);

  const handleLinkToNote = async (noteId: string | null) => {
    setLinking(true);
    try {
      await onLinkToNote(screenshot.id, noteId);
      setShowLinkMenu(false);
    } catch (error) {
      console.error('Error linking to note:', error);
    } finally {
      setLinking(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="aspect-video bg-gray-100 relative group">
        <img
          src={screenshot.imageData}
          alt={screenshot.title}
          className="w-full h-full object-cover"
        />

        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex space-x-2">
            <button
              onClick={() => setShowLinkMenu(!showLinkMenu)}
              className="px-3 py-1 bg-white bg-opacity-90 text-gray-800 rounded text-sm hover:bg-white transition-colors"
              title="Link to note"
            >
              📎 Link
            </button>
            <button
              onClick={() => onDelete(screenshot.id)}
              className="px-3 py-1 bg-red-600 bg-opacity-90 text-white rounded text-sm hover:bg-red-700 transition-colors"
              title="Delete screenshot"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
          {screenshot.title}
        </h3>

        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
            {screenshot.subject}
          </span>
          <span>{formatDate(screenshot.createdAt)}</span>
        </div>

        {/* Linked note */}
        {screenshot.note && (
          <div className="text-xs text-gray-500 mb-2">
            Linked to: <span className="font-medium">{screenshot.note.title}</span>
          </div>
        )}

        {/* Link menu */}
        {showLinkMenu && (
          <div className="mt-2 p-2 bg-gray-50 rounded border">
            <div className="text-xs font-medium text-gray-700 mb-2">Link to Note:</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              <button
                onClick={() => handleLinkToNote(null)}
                disabled={linking}
                className="w-full text-left px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50"
              >
                {linking ? 'Unlinking...' : 'Unlink from note'}
              </button>
              {notes.map(note => (
                <button
                  key={note.id}
                  onClick={() => handleLinkToNote(note.id)}
                  disabled={linking}
                  className="w-full text-left px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50"
                >
                  {note.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}