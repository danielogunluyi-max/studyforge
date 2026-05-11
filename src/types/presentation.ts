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
  /** Citations / source tags for this slide */
  sources?: string[];
  /** Hint for image generation (Unsplash-style keywords or description) */
  imagePrompt?: string;
  /** Resolved image URL once the user clicks "Generate Image" or uploads */
  imageUrl?: string;
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
