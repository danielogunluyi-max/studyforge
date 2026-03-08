import { z } from "zod";

export const slideTypeSchema = z.enum(["title", "content", "two_column", "quote", "end"]);

export const slideDataSchema = z.object({
  id: z.string().min(1),
  type: slideTypeSchema,
  title: z.string().min(1),
  subtitle: z.string().optional(),
  bullets: z.array(z.string().min(1)).max(5).optional(),
  leftHeader: z.string().optional(),
  leftBullets: z.array(z.string().min(1)).max(5).optional(),
  rightHeader: z.string().optional(),
  rightBullets: z.array(z.string().min(1)).max(5).optional(),
  quote: z.string().optional(),
  attribution: z.string().optional(),
  notes: z.string().optional(),
});

export const presentationDataSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  theme: z.string().min(1),
  slides: z.array(slideDataSchema).min(1),
  includeNotes: z.boolean().optional(),
});

export const themeConfigSchema = z.object({
  bg: z.string().min(1),
  accent: z.string().min(1),
  text: z.string().min(1),
  secondary: z.string().min(1),
  titleBg: z.string().min(1),
});

export const generatePresentationRequestSchema = z.object({
  input: z.string().min(1),
  inputType: z.enum(["notes", "topic"]),
  slideCount: z.number().int().min(5).max(20),
  style: z.enum(["academic", "minimal", "creative", "professional"]),
  subject: z.string().min(1),
  includeNotes: z.boolean(),
});

export const downloadPresentationRequestSchema = z.object({
  presentation: presentationDataSchema,
  theme: themeConfigSchema.optional(),
});
