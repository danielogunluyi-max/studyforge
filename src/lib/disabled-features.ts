export type DisabledFeature = { path: string; slug: string; name: string };
export const DISABLED_FEATURES: DisabledFeature[] = [
  { path: "/plagiarism", slug: "originality", name: "Originality Check" },
  { path: "/kyvex-iq", slug: "iq", name: "Kyvex IQ" },
  { path: "/study-dna", slug: "study-dna", name: "Study DNA" },
  { path: "/predictor", slug: "predictor", name: "Score Predictor" },
  { path: "/my-predictions", slug: "predictor", name: "My Predictions" },
];
export function matchDisabledFeature(pathname: string) {
  return DISABLED_FEATURES.find(
    (f) => pathname === f.path || pathname.startsWith(f.path + "/"),
  );
}
