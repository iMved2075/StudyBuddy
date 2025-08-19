'use server';
/**
 * @fileOverview An AI agent that suggests related terms or definitions for flashcards based on the user's input.
 *
 * - suggestFlashcardContent - A function that handles the flashcard content suggestion process.
 * - SuggestFlashcardContentInput - The input type for the suggestFlashcardContent function.
 * - SuggestFlashcardContentOutput - The return type for the suggestFlashcardContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestFlashcardContentInputSchema = z.object({
  topic: z.string().describe('The main topic of the flashcard.'),
  existingContent: z.string().describe('The existing content of the flashcard (can be empty).'),
});


const SuggestFlashcardContentOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('An array of suggested related terms or definitions.'),
});


export async function suggestFlashcardContent(input) {
  return suggestFlashcardContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestFlashcardContentPrompt',
  input: {schema: SuggestFlashcardContentInputSchema},
  output: {schema: SuggestFlashcardContentOutputSchema},
  prompt: `You are an AI assistant designed to suggest related terms or definitions for flashcards.

  Based on the topic and existing content provided, generate a list of suggestions that can help the user create a comprehensive and effective flashcard.

  Topic: {{{topic}}}
  Existing Content: {{{existingContent}}}

  Suggestions should be concise and directly relevant to the topic.
  Return the suggestions as a JSON array of strings.
  `,
});

const suggestFlashcardContentFlow = ai.defineFlow(
  {
    name: 'suggestFlashcardContentFlow',
    inputSchema: SuggestFlashcardContentInputSchema,
    outputSchema: SuggestFlashcardContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output;
  }
);
