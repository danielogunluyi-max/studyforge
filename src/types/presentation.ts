export interface SlideData {
  id: string;
  type: "title" | "content" | "two_column" | "quote" | "end";
  title: string;
  subtitle?: string;
  bullets?: string[];
  leftHeader?: string;
  leftBullets?: string[];
  rightHeader?: string;
  rightBullets?: string[];
  quote?: string;
  attribution?: string;
  notes?: string;
}

export interface PresentationData {
  title: string;
  subtitle?: string;
  theme: string;
  slides: SlideData[];
  includeNotes?: boolean;
}

export interface ThemeConfig {
  bg: string;
  accent: string;
  text: string;
  secondary: string;
  titleBg: string;
}
