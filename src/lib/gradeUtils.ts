export function percentToLetter(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 87) return "A";
  if (score >= 80) return "A-";
  if (score >= 77) return "B+";
  if (score >= 73) return "B";
  if (score >= 70) return "B-";
  if (score >= 67) return "C+";
  if (score >= 63) return "C";
  if (score >= 60) return "C-";
  if (score >= 57) return "D+";
  if (score >= 53) return "D";
  if (score >= 50) return "D-";
  return "F";
}

export function getGradeColor(score: number): string {
  if (score >= 80) return "var(--accent-green)";
  if (score >= 70) return "var(--accent-blue)";
  if (score >= 60) return "var(--accent-yellow)";
  if (score >= 50) return "var(--accent-orange, #f97316)";
  return "var(--accent-red)";
}

export function calculateOntarioOverall(
  ku: number,
  thinking: number,
  comm: number,
  app: number,
): number {
  return ku * 0.3 + thinking * 0.3 + comm * 0.2 + app * 0.2;
}

export function getCategoryLabel(key: string): string {
  if (key === "gradeKU") return "Knowledge & Understanding";
  if (key === "gradeThinking") return "Thinking & Inquiry";
  if (key === "gradeComm") return "Communication";
  if (key === "gradeApp") return "Application";
  return key;
}
