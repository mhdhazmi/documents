import { z } from 'zod';

export const ocrResultSchema = z.object({
  arabic: z.string(),
  english: z.string(),
  keywordsArabic: z.array(z.string()),
  keywordsEnglish: z.array(z.string())
});

export type OCRResult = z.infer<typeof ocrResultSchema>;