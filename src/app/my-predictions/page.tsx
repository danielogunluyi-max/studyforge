"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "~/app/_components/app-nav";

type PredictionRecord = {
  id: string;
  examType: string;
  createdAt: string;
  predictions: Array<{ question: string; confidence: string }>;
};

export default function MyPredictionsPage() {
  const [records, setRecords] = useState<PredictionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/exam-predictions");
        const data = (await response.json()) as { predictions?: PredictionRecord[] };
        setRecords(data.predictions ?? []);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchRecords();
  }, []);

  const deleteRecord = async (id: string) => {
    await fetch(`/api/exam-predictions/${id}`, { method: "DELETE" });
    setRecords((prev) => prev.filter((record) => record.id !== id));
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="container mx-auto max-w-5xl px-6 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My Predictions</h1>
          <Link href="/exam-predictor" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            New Prediction
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-600">Loading predictions...</p>
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-600">No saved predictions yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <div key={record.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{record.examType}</p>
                    <p className="text-xs text-gray-500">{new Date(record.createdAt).toLocaleString()}</p>
                  </div>
                  <button onClick={() => void deleteRecord(record.id)} className="text-xs font-semibold text-red-600">
                    Delete
                  </button>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {(record.predictions ?? []).slice(0, 5).map((item, index) => (
                    <li key={`${record.id}-${index}`}>{item.question} ({item.confidence})</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
