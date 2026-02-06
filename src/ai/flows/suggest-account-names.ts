'use server';

/**
 * @fileOverview A flow for suggesting account names using AI.
 *
 * - suggestAccountNames - A function that suggests account names based on a given input.
 * - SuggestAccountNamesInput - The input type for the suggestAccountNames function.
 * - SuggestAccountNamesOutput - The return type for the suggestAccountNames function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAccountNamesInputSchema = z.object({
  partialAccountName: z
    .string()
    .describe('The partial account name to generate suggestions for.'),
});

export type SuggestAccountNamesInput = z.infer<
  typeof SuggestAccountNamesInputSchema
>;

const SuggestAccountNamesOutputSchema = z.object({
  suggestedAccountNames: z
    .array(z.string())
    .describe('An array of suggested account names.'),
});

export type SuggestAccountNamesOutput = z.infer<
  typeof SuggestAccountNamesOutputSchema
>;

export async function suggestAccountNames(
  input: SuggestAccountNamesInput
): Promise<SuggestAccountNamesOutput> {
  return suggestAccountNamesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAccountNamesPrompt',
  input: {schema: SuggestAccountNamesInputSchema},
  output: {schema: SuggestAccountNamesOutputSchema},
  prompt: `You are an expert accounting assistant. Given a partial account name, you will suggest a list of possible full account names that the user could use. Return the suggestions as a JSON array of strings.

Partial Account Name: {{{partialAccountName}}}`,
});

const suggestAccountNamesFlow = ai.defineFlow(
  {
    name: 'suggestAccountNamesFlow',
    inputSchema: SuggestAccountNamesInputSchema,
    outputSchema: SuggestAccountNamesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
