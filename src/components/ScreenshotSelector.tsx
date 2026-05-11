'use client';

import { useState, useEffect } from 'react';

interface Screenshot {
  id: string;
  title: string;
  subject: string;
  imageData: string;
  createdAt: string;
}

interface ScreenshotSelectorProps {
  selectedScreenshotIds: string[];
  onSelectionChange: (ids: string[]) => void;
  className?: string;
}

export default function ScreenshotSelector({
  selectedScreenshotIds,
  onSelectionChange,
  className = ''
}: ScreenshotSelectorProps) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    loadScreenshots();
  }, []);

  const loadScreenshots = async () => {
    try {
      const response = await fetch('/api/screenshots');
      if (response.ok) {
        const data = await response.json();
        setScreenshots(data);
      }
    } catch (error) {
      console.error('Error loading screenshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleScreenshot = (screenshotId: string) => {
    const isSelected = selectedScreenshotIds.includes(screenshotId);
    if (isSelected) {
      onSelectionChange(selectedScreenshotIds.filter(id => id !== screenshotId));
    } else {
      onSelectionChange([...selectedScreenshotIds, screenshotId]);
    }
  };

  const selectedCount = selectedScreenshotIds.length;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setShowSelector(!showSelector)}
        className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span>📎 Attach Screenshots</span>
        {selectedCount > 0 && (
          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
            {selectedCount}
          </span>
        )}
      </button>

      {showSelector && (
        <div className="mt-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Select Screenshots to Attach</h4>
            <button
              onClick={() => setShowSelector(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div className="text-center py-4 text-gray-500">Loading screenshots...</div>
          ) : screenshots.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No screenshots available. <a href="/screenshots" className="text-blue-600 hover:underline">Create one first</a>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
              {screenshots.map((screenshot) => (
                <div
                  key={screenshot.id}
                  onClick={() => toggleScreenshot(screenshot.id)}
                  className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                    selectedScreenshotIds.includes(screenshot.id)
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="aspect-video bg-gray-100">
                    <img
                      src={screenshot.imageData}
                      alt={screenshot.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2 bg-white">
                    <h5 className="text-xs font-medium text-gray-900 line-clamp-1">
                      {screenshot.title}
                    </h5>
                    <p className="text-xs text-gray-500">{screenshot.subject}</p>
                  </div>
                  {selectedScreenshotIds.includes(screenshot.id) && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedCount > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {selectedCount} screenshot{selectedCount !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}