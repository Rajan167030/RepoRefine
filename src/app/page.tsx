"use client";

import { useState, useTransition } from "react";
import { Github, Sparkles, Copy, Loader2 } from "lucide-react";
import { handleGenerateReadme } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Repo {
  name: string;
  description: string | null;
}

export default function Home() {
  const [isFetchingRepos, startFetchingRepos] = useTransition();
  const [isGenerating, startGenerating] = useTransition();

  const [username, setUsername] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepoName, setSelectedRepoName] = useState("");
  const [prompt, setPrompt] = useState("Create a professional and comprehensive README file, including sections for project description, usage, and contribution guidelines.");
  const [readme, setReadme] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchRepos = async () => {
    if (!username) {
      setError("Please enter a GitHub username.");
      return;
    }
    setError(null);
    setRepos([]);
    setSelectedRepoName("");
    setReadme("");

    startFetchingRepos(async () => {
      try {
        const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&direction=desc`);
        if (!response.ok) {
          throw new Error(`Failed to fetch repositories. GitHub API returned ${response.status}.`);
        }
        const data = await response.json();
        if (data.length === 0) {
          setError("No public repositories found for this user.");
          return;
        }
        setRepos(data.map((repo: any) => ({ name: repo.name, description: repo.description })));
      } catch (e: any) {
        setError(e.message);
        setRepos([]);
      }
    });
  };

  const generateReadmeAction = async () => {
    if (!selectedRepoName) {
      setError("Please select a repository.");
      return;
    }
    setError(null);
    setReadme("");

    startGenerating(async () => {
      const selectedRepo = repos.find(repo => repo.name === selectedRepoName);
      if (!selectedRepo) {
        setError("Selected repository not found.");
        return;
      }
      
      const result = await handleGenerateReadme({
        repoName: selectedRepo.name,
        repoDescription: selectedRepo.description || "No description provided.",
        userName: username,
        prompt,
      });

      if (result.success && result.data) {
        setReadme(result.data.readmeContent);
      } else {
        setError(result.error || "Failed to generate README.");
        setReadme("");
      }
    });
  };

  const copyToClipboard = () => {
    if (!readme) return;
    navigator.clipboard.writeText(readme);
    toast({
      title: "Copied to clipboard!",
      description: "The README content has been copied.",
    });
  };

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold font-headline text-primary mb-2">RepoRefine</h1>
          <p className="text-lg text-muted-foreground">AI-powered READMEs for your GitHub repositories.</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github />
                Configuration
              </CardTitle>
              <CardDescription>Enter your GitHub details and a prompt to generate a README.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">GitHub Username</Label>
                <div className="flex gap-2">
                  <Input 
                    id="username" 
                    placeholder="e.g., firebase" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchRepos()}
                  />
                  <Button onClick={fetchRepos} disabled={isFetchingRepos}>
                    {isFetchingRepos ? <Loader2 className="animate-spin" /> : "Fetch Repos"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="repository">Repository</Label>
                <Select
                  value={selectedRepoName}
                  onValueChange={setSelectedRepoName}
                  disabled={repos.length === 0 || isFetchingRepos}
                >
                  <SelectTrigger id="repository">
                    <SelectValue placeholder="Select a repository" />
                  </SelectTrigger>
                  <SelectContent>
                    {repos.map((repo) => (
                      <SelectItem key={repo.name} value={repo.name}>
                        {repo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe the style and content for your README..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                />
              </div>

              <Button onClick={generateReadmeAction} disabled={isGenerating || !selectedRepoName} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles className="mr-2" />}
                Generate README
              </Button>
              {error && <p className="text-sm text-destructive text-center pt-2">{error}</p>}
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles />
                  Preview & Edit
                </div>
                <Button variant="ghost" size="icon" onClick={copyToClipboard} disabled={!readme} aria-label="Copy README content">
                  <Copy className="size-4" />
                </Button>
              </CardTitle>
              <CardDescription>Your generated README will appear here. You can edit it directly.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex">
              {isGenerating ? (
                 <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-md min-h-[400px]">
                    <div className="text-center space-y-2">
                        <Loader2 className="mx-auto size-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Generating your README...</p>
                        <p className="text-sm text-muted-foreground/80">This might take a moment.</p>
                    </div>
                 </div>
              ) : (
                <Textarea
                  className="w-full h-full min-h-[400px] flex-grow font-code text-base resize-none"
                  placeholder="Your generated README will be displayed here..."
                  value={readme}
                  onChange={(e) => setReadme(e.target.value)}
                  aria-label="README preview and editor"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
