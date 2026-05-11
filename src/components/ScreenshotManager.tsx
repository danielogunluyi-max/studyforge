'use client';

import { useState } from 'react';
import ScreenshotCapture from './ScreenshotCapture';

interface ScreenshotData {
  id: string;
  title: string;
  subject: string;
  imageData: string;
  createdAt: string;
}

export default function ScreenshotManager() {
  const [screenshots, setScreenshots] = useState<ScreenshotData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [currentImageData, setCurrentImageData] = useState<string>('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);

  const handleScreenshotTaken = (dataUrl: string) => {
    setCurrentImageData(dataUrl);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !subject.trim() || !currentImageData) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/screenshots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          imageData: currentImageData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save screenshot');
      }

      const newScreenshot = await response.json();
      setScreenshots(prev => [newScreenshot, ...prev]);

      // Reset form
      setTitle('');
      setSubject('');
      setCurrentImageData('');
      setShowForm(false);
    } catch (error) {
      console.error('Error saving screenshot:', error);
      alert('Failed to save screenshot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setSubject('');
    setCurrentImageData('');
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Screenshot Manager</h2>
        <ScreenshotCapture onScreenshotTaken={handleScreenshotTaken} />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Screenshot</h3>

            {currentImageData && (
              <div className="mb-4">
                <img
                  src={currentImageData}
                  alt="Screenshot preview"
                  className="max-w-full h-auto border rounded"
                />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter screenshot title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Subject/Course</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Mathematics, History, Biology"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {screenshots.map((screenshot) => (
          <div key={screenshot.id} className="border border-gray-200 rounded-lg p-4">
            <img
              src={screenshot.imageData}
              alt={screenshot.title}
              className="w-full h-48 object-cover rounded mb-2"
            />
            <h3 className="font-semibold">{screenshot.title}</h3>
            <p className="text-sm text-gray-600">{screenshot.subject}</p>
            <p className="text-xs text-gray-500">
              {new Date(screenshot.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {screenshots.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No screenshots yet. Click "Capture Screenshot" to get started!</p>
        </div>
      )}
    </div>
  );
}