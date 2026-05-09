import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Validate API key exists before initializing
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!geminiApiKey) {
  console.warn(`
    ⚠️  Gemini API Key not found!
    Please set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.
    Get your API key from: https://aistudio.google.com/app/apikey
    Add it to your .env file in the project root.
  `);
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: geminiApiKey,
    })
  ],
  model: 'googleai/gemini-2.0-flash',
});
