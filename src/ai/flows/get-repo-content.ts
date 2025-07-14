'use server';
/**
 * @fileOverview Fetches the content of a GitHub repository.
 *
 * - getRepoContent - Fetches the repository's file tree and content of key files.
 * - RepoContentInput - The input type for the getRepoContent function.
 * - RepoContentOutput - The return type for the getRepoContent function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const RepoContentInputSchema = z.object({
  userName: z.string().describe('The GitHub username of the repository owner.'),
  repoName: z.string().describe('The name of the GitHub repository.'),
});
export type RepoContentInput = z.infer<typeof RepoContentInputSchema>;

export const RepoContentOutputSchema = z.object({
  tree: z.any().describe('The file and folder structure of the repository.'),
  packageJson: z.string().optional().describe('The content of package.json, if it exists.'),
});
export type RepoContentOutput = z.infer<typeof RepoContentOutputSchema>;

// Helper function to decode base64 content
function decodeBase64(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('utf-8');
}

export const getRepoContent = ai.defineTool(
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
      // Return a simplified error-like structure or an empty structure
      return {
        tree: ['Error fetching repository structure.'],
      };
    }
  }
);