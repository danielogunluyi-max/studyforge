import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export type HandwritingScanInput = {
  imageBase64: string;
  mimeType: string;
  subject?: string;
};

export type HandwritingScanOutput = {
  text: string;
  confidence: number;
  illegibleCount: number;
  passes: number;
};

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const CLEANUP_MODEL = "llama-3.3-70b-versatile";

function normalizeBase64(input: string) {
  return input.includes(",") ? input.split(",").pop() ?? "" : input;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function runHandwritingScan(input: HandwritingScanInput): Promise<HandwritingScanOutput> {
  const imageBase64 = normalizeBase64(String(input.imageBase64 ?? "").trim());
  const mimeType = String(input.mimeType ?? "image/jpeg").trim() || "image/jpeg";
  const subject = String(input.subject ?? "").trim();

  if (!imageBase64) {
    throw new Error("Image data is required");
  }

  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ API key");
  }

  const firstPass = await groq.chat.completions.create({
    model: VISION_MODEL,
    max_tokens: 4000,
    temperature: 0.2,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: "high",
            },
          } as any,
          {
            type: "text",
            text: `You are an expert at reading handwritten student notes, even extremely messy or unclear handwriting.

Subject context: ${subject || "General study notes"}

Your instructions:
1. Read EVERY single word you can see, no matter how messy
2. Use subject context clues - if this is a math note and you see something unclear near an equation, make an educated guess
3. Fix obvious spelling mistakes silently but keep all content accurate
4. Preserve the EXACT structure of the notes:
   - If there are bullet points, keep them as bullet points
   - If there are numbered lists, keep the numbers
   - If there are headings or titles written larger, mark them as headings
   - If there are diagrams described in text, note them as [Diagram: description]
   - If there are arrows or connections drawn, describe them
5. For truly illegible words, write [illegible] but ALWAYS try first
6. Never skip any section of the image - scan everything from top to bottom, left to right
7. If there are multiple columns, read each column separately
8. Look for: dates, page numbers, chapter references, formulas, definitions
9. Output clean, readable, well-structured text
10. Be AGGRESSIVE about reading - an educated guess is always better than skipping

Return ONLY the transcribed text. No commentary. No explanations. Just the notes.`,
          },
        ],
      },
    ],
  });

  const firstPassText = String(firstPass.choices[0]?.message?.content ?? "").trim();
  if (!firstPassText) {
    throw new Error("No readable handwritten text detected");
  }

  const illegibleCount = (firstPassText.match(/\[illegible\]/gi) ?? []).length;
  let finalText = firstPassText;
  let confidence = 100 - illegibleCount * 5;
  let passes = 2;

  if (illegibleCount > 3) {
    const secondPass = await groq.chat.completions.create({
      model: VISION_MODEL,
      max_tokens: 2000,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high",
              },
            } as any,
            {
              type: "text",
              text: `Look at this handwritten notes image again very carefully.

My first scan produced this text:
${firstPassText}

I marked ${illegibleCount} words as illegible. Please:
1. Focus specifically on the unclear/messy parts of the image
2. Use the surrounding context from what was successfully read to guess the unclear words
3. Look at the overall topic and subject to make intelligent guesses
4. Return ONLY the corrected/improved version of the full text
5. Replace as many [illegible] markers as possible with your best guess
6. Add (?) after any word you are guessing but not certain about

Return the complete improved transcription.`,
            },
          ],
        },
      ],
    });

    finalText = String(secondPass.choices[0]?.message?.content ?? firstPassText).trim() || firstPassText;
    confidence = Math.max(60, confidence + 20);
    passes = 3;
  }

  const cleanupPass = await groq.chat.completions.create({
    model: CLEANUP_MODEL,
    max_tokens: 4000,
    temperature: 0.2,
    messages: [
      {
        role: "user",
        content: `Clean up and structure these transcribed handwritten notes:

${finalText}

Instructions:
1. Fix any remaining spelling errors
2. Improve formatting and structure
3. Make sure headings are clearly marked
4. Ensure bullet points and lists are consistent
5. Do NOT change any actual content or information
6. Do NOT add information that wasn't in the original
7. Return clean, well-formatted notes ready for studying

Return only the cleaned notes.`,
      },
    ],
  });

  const cleanedText = String(cleanupPass.choices[0]?.message?.content ?? finalText).trim() || finalText;

  return {
    text: cleanedText,
    confidence: clamp(Math.round(confidence), 30, 100),
    illegibleCount,
    passes,
  };
}
