'use client';

import { useState, useEffect, useMemo } from 'react';
import ScreenshotCapture from './ScreenshotCapture';
import ScreenshotCard from './ScreenshotCard';

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

export default function ScreenshotGallery() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [currentImageData, setCurrentImageData] = useState<string>('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [saving, setSaving] = useState(false);

  // Get unique subjects for filter dropdown
  const subjects = useMemo(() => {
    const uniqueSubjects = [...new Set(screenshots.map(s => s.subject))];
    return uniqueSubjects.sort();
  }, [screenshots]);

  // Filter screenshots based on search and subject
  const filteredScreenshots = useMemo(() => {
    return screenshots.filter(screenshot => {
      const matchesSearch = screenshot.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = !selectedSubject || screenshot.subject === selectedSubject;
      return matchesSearch && matchesSubject;
    });
  }, [screenshots, searchTerm, selectedSubject]);

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

  const loadNotes = async () => {
    try {
      const response = await fetch('/api/notes?limit=100');
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  useEffect(() => {
    loadScreenshots();
    loadNotes();
  }, []);

  const handleScreenshotTaken = (dataUrl: string) => {
    setCurrentImageData(dataUrl);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !subject.trim() || !currentImageData) {
      alert('Please fill in all fields');
      return;
    }

    setSaving(true);
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
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this screenshot?')) {
      return;
    }

    try {
      const response = await fetch(`/api/screenshots?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete screenshot');
      }

      setScreenshots(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting screenshot:', error);
      alert('Failed to delete screenshot. Please try again.');
    }
  };

  const handleLinkToNote = async (screenshotId: string, noteId: string | null) => {
    try {
      const response = await fetch(`/api/screenshots?id=${screenshotId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ noteId }),
      });

      if (!response.ok) {
        throw new Error('Failed to link screenshot to note');
      }

      const updatedScreenshot = await response.json();
      setScreenshots(prev =>
        prev.map(s => s.id === screenshotId ? updatedScreenshot : s)
      );
    } catch (error) {
      console.error('Error linking screenshot to note:', error);
      alert('Failed to link screenshot to note. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-500">Loading screenshots...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Screenshot Gallery</h1>
        <ScreenshotCapture onScreenshotTaken={handleScreenshotTaken} />
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search screenshots..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="sm:w-64">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        {filteredScreenshots.length} screenshot{filteredScreenshots.length !== 1 ? 's' : ''}
        {searchTerm && ` matching "${searchTerm}"`}
        {selectedSubject && ` in ${selectedSubject}`}
      </div>

      {/* Gallery Grid */}
      {filteredScreenshots.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {screenshots.length === 0
            ? 'No screenshots yet. Click "Capture Screenshot" to get started!'
            : 'No screenshots match your search criteria.'
          }
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredScreenshots.map((screenshot) => (
            <ScreenshotCard
              key={screenshot.id}
              screenshot={screenshot}
              notes={notes}
              onDelete={handleDelete}
              onLinkToNote={handleLinkToNote}
            />
          ))}
        </div>
      )}

      {/* Save Screenshot Modal */}
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
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}