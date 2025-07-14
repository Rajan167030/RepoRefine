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

// Tool Definition for getRepoContent
const RepoContentInputSchema = z.object({
  userName: z.string().describe('The GitHub username of the repository owner.'),
  repoName: z.string().describe('The name of the GitHub repository.'),
});

const RepoContentOutputSchema = z.object({
  tree: z.any().describe('The file and folder structure of the repository.'),
  packageJson: z.string().optional().describe('The content of package.json, if it exists.'),
});

function decodeBase64(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('utf-8');
}

const getRepoContent = ai.defineTool(
  {
    name: 'getRepoContent',
    description: 'Fetches the file and folder structure of a GitHub repository, along with the content of key files like package.json.',
    inputSchema: RepoContentInputSchema,
    outputSchema: RepoContentOutputSchema,
  },
  async ({ userName, repoName }) => {
    try {
      // 1. Get the default branch
      const repoRes = await fetch(`https://api.github.com/repos/${userName}/${repoName}`);
      if (!repoRes.ok) throw new Error(`Failed to fetch repo details for ${userName}/${repoName}`);
      const repoData = await repoRes.json();
      const defaultBranch = repoData.default_branch;

      // 2. Get the commit SHA for the default branch
      const branchRes = await fetch(`https://api.github.com/repos/${userName}/${repoName}/branches/${defaultBranch}`);
      if (!branchRes.ok) throw new Error(`Failed to fetch branch details for ${userName}/${repoName}`);
      const branchData = await branchRes.json();
      const treeSha = branchData.commit.commit.tree.sha;

      // 3. Get the file tree recursively
      const treeRes = await fetch(`https://api.github.com/repos/${userName}/${repoName}/git/trees/${treeSha}?recursive=1`);
      if (!treeRes.ok) throw new Error(`Failed to fetch file tree for ${userName}/${repoName}`);
      const treeData = await treeRes.json();

      // Filter out binary files for brevity and extract file paths
      const fileTree = treeData.tree
        .map((node: any) => node.path)
        .filter((path: string) => !path.match(/\.(jpg|jpeg|png|gif|bmp|ico|svg|webp|pdf|zip|gz|rar|woff|woff2|eot|ttf|otf)$/i));

      // 4. Find and fetch package.json if it exists
      let packageJsonContent: string | undefined = undefined;
      const packageJsonNode = treeData.tree.find((node: any) => node.path === 'package.json');

      if (packageJsonNode && packageJsonNode.url) {
        const packageJsonRes = await fetch(packageJsonNode.url);
        if (packageJsonRes.ok) {
          const packageJsonData = await packageJsonRes.json();
          if (packageJsonData.content) {
            packageJsonContent = decodeBase64(packageJsonData.content);
          }
        }
      }

      return {
        tree: fileTree,
        packageJson: packageJsonContent,
      };
    } catch (error) {
      console.error('Error fetching repository content:', error);
      return {
        tree: ['Error fetching repository structure.'],
      };
    }
  }
);


// Flow Definition for generateReadme
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

const generateReadmePrompt = ai.definePrompt({
  name: 'generateReadmePrompt',
  input: {schema: GenerateReadmeInputSchema},
  output: {schema: GenerateReadmeOutputSchema},
  tools: [getRepoContent],
  prompt: `You are an expert software engineer specializing in creating professional README files for GitHub repositories.

  Your goal is to generate a comprehensive and accurate README file. To do this, you MUST first call the 'getRepoContent' tool to fetch the repository's file structure and the content of key files like 'package.json'. This information is crucial for understanding the project's dependencies, scripts, and overall architecture.

  Analyze the file structure, package.json content (if available), and the other provided details to create the README.

  Repository Name: {{{repoName}}}
  Repository Description: {{{repoDescription}}}
  User Prompt: {{{prompt}}}

  The README should include the following sections, based on the data you've fetched:

  - Project Title: The repository name.
  - Project Description: A detailed explanation of the project's purpose and functionality. Use the repo description as a starting point, but expand on it using your analysis of the code.
  - Tech Stack / Dependencies: List the main technologies and libraries used. You can infer this from 'package.json'.
  - File Structure: Briefly explain the layout of the project directory.
  - Getting Started / Installation: Provide steps to install dependencies and get the project running. Look for scripts in 'package.json' (e.g., 'dev', 'start', 'build').
  - Usage: Explain how to use the project.
  - Contribution Guidelines: Information on how others can contribute.
  - License: Information about the project's license.

  Make sure the README is well-formatted in Markdown, easy to read, and professional.
  Include code snippets where appropriate (e.g., installation commands).
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
