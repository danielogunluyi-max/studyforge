import ScreenshotGallery from '@/components/ScreenshotGallery';

export default function ScreenshotsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <ScreenshotGallery />
      </div>
    </main>
  );
}