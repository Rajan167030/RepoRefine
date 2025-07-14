
'use server';
/**
 * @fileOverview Generates a README file for a given GitHub repository based on a user-provided prompt.
 *
 * - generateReadme - A function that generates the README content.
 */

import {ai} from '@/ai/genkit';
import { GenerateReadmeInputSchema, GenerateReadmeOutputSchema, type GenerateReadmeInput, type GenerateReadmeOutput } from './readme.types';
import {z} from 'zod';

function decodeBase64(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('utf-8');
}

const getRepoContent = ai.defineTool(
  {
    name: 'getRepoContent',
    description: 'Fetches the file and folder structure of a GitHub repository, along with the content of key source files.',
    inputSchema: GenerateReadmeInputSchema.pick({ userName: true, repoName: true }),
    outputSchema: z.object({
      tree: z.array(z.string()).describe('The file and folder structure of the repository.'),
      files: z.array(z.object({
        path: z.string(),
        content: z.string(),
      })).describe('An array of key files from the repository with their content.'),
    }),
  },
  async ({ userName, repoName }) => {
    try {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };
      if (process.env.GITHUB_ACCESS_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`;
      }

      const repoRes = await fetch(`https://api.github.com/repos/${userName}/${repoName}`, { headers });
      if (!repoRes.ok) throw new Error(`Failed to fetch repo details: ${await repoRes.text()}`);
      const repoData = await repoRes.json();
      const defaultBranch = repoData.default_branch;

      const branchRes = await fetch(`https://api.github.com/repos/${userName}/${repoName}/branches/${defaultBranch}`, { headers });
      if (!branchRes.ok) throw new Error(`Failed to fetch branch details: ${await branchRes.text()}`);
      const branchData = await branchRes.json();
      const treeSha = branchData.commit.commit.tree.sha;

      const treeRes = await fetch(`https://api.github.com/repos/${userName}/${repoName}/git/trees/${treeSha}?recursive=1`, { headers });
      if (!treeRes.ok) throw new Error(`Failed to fetch file tree: ${await treeRes.text()}`);
      const treeData = await treeRes.json();

      const allFilePaths = treeData.tree.map((node: any) => node.path);
      
      const keyFilePatterns = [
        'package.json',
        'README.md', 'readme.md',
        'src/index.js', 'src/index.ts', 'src/index.tsx',
        'src/main.js', 'src/main.ts', 'src/main.tsx',
        'src/app/page.tsx', 'src/app/page.jsx', 'src/app/layout.tsx',
        'vite.config.js', 'vite.config.ts',
        'next.config.js', 'next.config.mjs',
        'tailwind.config.js', 'tailwind.config.ts',
        'firebase.json',
        'public/index.html',
        'Gemfile',
        'requirements.txt',
        'pom.xml',
        'composer.json',
        'Cargo.toml'
      ];
      
      const filePromises = treeData.tree
        .filter((node: any) => keyFilePatterns.includes(node.path) && node.type === 'blob' && node.url)
        .map(async (node: any) => {
          try {
            const fileRes = await fetch(node.url, { headers });
            if (!fileRes.ok) return null;
            const fileData = await fileRes.json();
            if (fileData.content) {
              return {
                path: node.path,
                content: decodeBase64(fileData.content),
              };
            }
          } catch (e) {
            console.error(`Failed to fetch content for ${node.path}`, e);
          }
          return null;
        });

      const files = (await Promise.all(filePromises)).filter(Boolean);

      return {
        tree: allFilePaths,
        files: files as { path: string; content: string; }[],
      };
    } catch (error) {
      console.error('Error fetching repository content:', error);
      throw new Error(`Failed to fetch repository content. Please ensure the repository is public and your GitHub token is valid. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

const generateReadmePrompt = ai.definePrompt({
  name: 'generateReadmePrompt',
  input: {schema: GenerateReadmeInputSchema},
  output: {schema: GenerateReadmeOutputSchema},
  tools: [getRepoContent],
  prompt: `You are an expert software engineer specializing in creating professional README files for GitHub repositories.

Your goal is to generate a comprehensive and accurate README file. To do this, you MUST first call the 'getRepoContent' tool to fetch the repository's file structure and the content of key files. This information is crucial for understanding the project's dependencies, scripts, and overall architecture.

Analyze the file structure and the content of all provided files to create the README.

Your primary instruction for the style, tone, and content of the README comes from the user's prompt. Use it to guide the entire generation process.

Repository Name: {{{repoName}}}
Repository Description: {{{repoDescription}}}
User Prompt: {{{prompt}}}

Based on your analysis and the user's prompt, the README should include the following sections:

- Project Title: The repository name.
- Project Description: A detailed explanation of the project's purpose and functionality. Use the repo description as a starting point, but expand on it using your analysis of the code and the guidance from the user's prompt.
- Tech Stack / Dependencies: List the main technologies and libraries used. You can infer this from 'package.json' or other dependency files.
- File Structure: Briefly explain the layout of the project directory.
- Getting Started / Installation: Provide clear, step-by-step instructions to install dependencies and get the project running. Look for scripts in 'package.json' (e.g., 'dev', 'start', 'build') or instructions in other files.
- Usage: Explain how to use the project after installation.
- Contribution Guidelines: Add a section with standard contribution guidelines.
- License: Add a placeholder for license information if not found.

Make sure the README is well-formatted in Markdown, easy to read, and professional.
Include code snippets where appropriate (e.g., installation commands, example usage).
Ensure that the response only includes the content of the README file itself.
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


export async function generateReadme(input: GenerateReadmeInput): Promise<GenerateReadmeOutput> {
  return generateReadmeFlow(input);
}
