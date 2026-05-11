'use client';

import { useState, useRef, useCallback } from 'react';

interface ScreenshotCaptureProps {
  onScreenshotTaken?: (dataUrl: string) => void;
}

export default function ScreenshotCapture({ onScreenshotTaken }: ScreenshotCaptureProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isSelecting) return;

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartPos({ x, y });
    setSelection({ x, y, width: 0, height: 0 });
  }, [isSelecting]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !startPos) return;

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);
    const x = Math.min(currentX, startPos.x);
    const y = Math.min(currentY, startPos.y);

    setSelection({ x, y, width, height });
  }, [isSelecting, startPos]);

  const handleMouseUp = useCallback(async () => {
    if (!isSelecting || !selection || selection.width === 0 || selection.height === 0) {
      setIsSelecting(false);
      setSelection(null);
      setStartPos(null);
      return;
    }

    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;

      // Capture the selected area
      const canvas = await html2canvas(document.body, {
        x: selection.x,
        y: selection.y,
        width: selection.width,
        height: selection.height,
        useCORS: true,
        allowTaint: true,
      });

      const dataUrl = canvas.toDataURL('image/png');
      onScreenshotTaken?.(dataUrl);

      // Reset selection
      setIsSelecting(false);
      setSelection(null);
      setStartPos(null);
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      alert('Screenshot capture failed. Please make sure html2canvas is installed.');
      setIsSelecting(false);
      setSelection(null);
      setStartPos(null);
    }
  }, [isSelecting, selection, onScreenshotTaken]);

  const startSelection = () => {
    setIsSelecting(true);
  };

  const cancelSelection = () => {
    setIsSelecting(false);
    setSelection(null);
    setStartPos(null);
  };

  return (
    <div className="relative">
      <button
        onClick={startSelection}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        disabled={isSelecting}
      >
        {isSelecting ? 'Select Area' : 'Capture Screenshot'}
      </button>

      {isSelecting && (
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-black bg-opacity-50 cursor-crosshair z-50"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div className="absolute top-4 left-4 text-white bg-black bg-opacity-75 p-2 rounded">
            Click and drag to select an area, then release to capture
            <button
              onClick={cancelSelection}
              className="ml-2 px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Cancel
            </button>
          </div>

          {selection && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20"
              style={{
                left: selection.x,
                top: selection.y,
                width: selection.width,
                height: selection.height,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}