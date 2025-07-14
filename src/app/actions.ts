'use server';

import { generateReadme } from '@/ai/flows/generate-readme';
import type { GenerateReadmeInput } from '@/ai/flows/generate-readme';

export async function handleGenerateReadme(input: GenerateReadmeInput) {
  try {
    const result = await generateReadme(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error generating README:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during README generation.';
    return { success: false, error: errorMessage };
  }
}