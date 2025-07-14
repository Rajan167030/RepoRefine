
import {z} from 'zod';

/**
 * @fileOverview Type definitions for the README generation flow.
 *
 * This file defines the input and output schemas and their corresponding
 * TypeScript types for the README generation functionality. These are separated
 * into their own file so they can be safely imported into client components
 * without bundling server-side code.
 *
 * - GenerateReadmeInputSchema - The Zod schema for the input of the README generation.
 * - GenerateReadmeInput - The TypeScript type for the input.
 * - GenerateReadmeOutputSchema - The Zod schema for the output of the README generation.
 * - GenerateReadmeOutput - The TypeScript type for the output.
 */

export const GenerateReadmeInputSchema = z.object({
  repoDescription: z.string().describe('The description of the GitHub repository.'),
  repoName: z.string().describe('The name of the GitHub repository.'),
  userName: z.string().describe('The username of the GitHub repository owner.'),
  prompt: z.string().describe('A prompt to guide the style and content of the README file.'),
});

export type GenerateReadmeInput = z.infer<typeof GenerateReadmeInputSchema>;

export const GenerateReadmeOutputSchema = z.object({
  readmeContent: z.string().describe('The generated README file content.'),
});

export type GenerateReadmeOutput = z.infer<typeof GenerateReadmeOutputSchema>;
