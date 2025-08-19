'use server';

import { suggestFlashcardContent } from '@/ai/flows/suggest-flashcard-content';
import { z } from 'zod';

const resultSchema = z.object({
  suggestions: z.array(z.string()).optional(),
  error: z.string().optional(),
});

export async function getAISuggestions(input) {
  try {
    const result = await suggestFlashcardContent(input);
    return { suggestions: result.suggestions };
  } catch (error) {
    console.error('AI suggestion failed:', error);
    return { error: 'Failed to get AI suggestions. Please try again.' };
  }
}
