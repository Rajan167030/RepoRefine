// src/ai/flows/generate-readme.ts
'use server';
/**
 * @fileOverview Generates a README file for a given GitHub repository based on a user-provided prompt.
 *
 * - generateReadme - A function that generates the README content.
 * - GenerateReadmeInput - The input type for the generateReadme function.
 * - GenerateReadmeOutput - The return type for the generateReadme function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReadmeInputSchema = z.object({
  repoDescription: z.string().describe('The description of the GitHub repository.'),
  repoName: z.string().describe('The name of the GitHub repository.'),
  userName: z.string().describe('The username of the GitHub repository owner.'),
  prompt: z.string().describe('A prompt to guide the style and content of the README file.'),
});

export type GenerateReadmeInput = z.infer<typeof GenerateReadmeInputSchema>;

const GenerateReadmeOutputSchema = z.object({
  readmeContent: z.string().describe('The generated README file content.'),
});

export type GenerateReadmeOutput = z.infer<typeof GenerateReadmeOutputSchema>;

export async function generateReadme(input: GenerateReadmeInput): Promise<GenerateReadmeOutput> {
  return generateReadmeFlow(input);
}

const generateReadmePrompt = ai.definePrompt({
  name: 'generateReadmePrompt',
  input: {schema: GenerateReadmeInputSchema},
  output: {schema: GenerateReadmeOutputSchema},
  prompt: `You are an expert software engineer specializing in creating professional README files for GitHub repositories.

  Based on the repository description, name, and the user's prompt, generate a comprehensive README file.

  Repository Name: {{{repoName}}}
  Repository Description: {{{repoDescription}}}
  User Prompt: {{{prompt}}}

  The README should include the following sections, if applicable:

  - Project Description: A detailed explanation of the project's purpose and functionality.
  - Usage: Instructions on how to use the project.
  - Contribution Guidelines: Information on how others can contribute to the project.
  - License: Information about the project's license.

  Make sure the README is well-formatted, easy to read, and professional.
  Include code snippets where appropriate.
  Write your response in markdown format.
  Ensure that the response only includes the content of the README file.
  `,
});

const generateReadmeFlow = ai.defineFlow(
  {
    name: 'generateReadmeFlow',
    inputSchema: GenerateReadmeInputSchema,
    outputSchema: GenerateReadmeOutputSchema,
  },
  async input => {
    const {output} = await generateReadmePrompt(input);
    return output!;
  }
);
