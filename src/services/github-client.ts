import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  draft: boolean;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
  mergeable_state?: string;
  labels: Array<{
    name: string;
    color: string;
  }>;
}

export interface GitHubSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubPullRequest[];
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  owner: {
    login: string;
    avatar_url: string;
  };
}

async function getValidAccessToken(userId: string): Promise<string> {
  const connection = await prisma.oAuthConnection.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: "GITHUB",
      },
    },
  });

  if (!connection || !connection.isValid) {
    throw new Error("GitHub not connected");
  }

  const accessToken = decryptToken(connection.accessToken);

  // Update last used
  await prisma.oAuthConnection.update({
    where: { id: connection.id },
    data: { lastUsedAt: new Date() },
  });

  return accessToken;
}

async function githubFetch(
  userId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getValidAccessToken(userId);

  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Mark connection as invalid
    const connection = await prisma.oAuthConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: "GITHUB",
        },
      },
    });
    if (connection) {
      await prisma.oAuthConnection.update({
        where: { id: connection.id },
        data: {
          isValid: false,
          lastErrorAt: new Date(),
          lastError: "Authentication failed",
        },
      });
    }
    throw new Error("GitHub authentication failed");
  }

  return response;
}

export async function searchGitHubPRs(
  userId: string,
  query: string,
  perPage: number = 20
): Promise<GitHubSearchResult> {
  // Note: Callers are responsible for including 'type:pr' if needed
  // to avoid duplicate qualifiers in the query
  const params = new URLSearchParams({
    q: query,
    per_page: perPage.toString(),
    sort: "updated",
    order: "desc",
  });

  const response = await githubFetch(
    userId,
    `/search/issues?${params.toString()}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("GitHub search failed:", errorText);
    throw new Error("Failed to search GitHub PRs");
  }

  return response.json();
}

export async function getRepoPRs(
  userId: string,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open",
  perPage: number = 30
): Promise<GitHubPullRequest[]> {
  const params = new URLSearchParams({
    state,
    per_page: perPage.toString(),
    sort: "updated",
    direction: "desc",
  });

  const response = await githubFetch(
    userId,
    `/repos/${owner}/${repo}/pulls?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get PRs for ${owner}/${repo}`);
  }

  return response.json();
}

export async function getPR(
  userId: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubPullRequest> {
  const response = await githubFetch(
    userId,
    `/repos/${owner}/${repo}/pulls/${prNumber}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get PR #${prNumber}`);
  }

  return response.json();
}

export async function getUserRepos(
  userId: string,
  perPage: number = 100
): Promise<GitHubRepo[]> {
  const params = new URLSearchParams({
    per_page: perPage.toString(),
    sort: "updated",
    direction: "desc",
  });

  const response = await githubFetch(userId, `/user/repos?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to get user repos");
  }

  return response.json();
}

export async function searchRepos(
  userId: string,
  query: string,
  perPage: number = 20
): Promise<{ items: GitHubRepo[] }> {
  const params = new URLSearchParams({
    q: query,
    per_page: perPage.toString(),
    sort: "updated",
    order: "desc",
  });

  const response = await githubFetch(
    userId,
    `/search/repositories?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to search repos");
  }

  return response.json();
}

export async function searchPRsByRepo(
  userId: string,
  owner: string,
  repo: string,
  searchText?: string,
  state: "open" | "closed" | "all" = "all",
  perPage: number = 20
): Promise<GitHubSearchResult> {
  let query = `repo:${owner}/${repo} type:pr`;

  if (searchText) {
    query += ` ${searchText}`;
  }

  if (state !== "all") {
    query += ` state:${state}`;
  }

  return searchGitHubPRs(userId, query, perPage);
}

export function getPRUrl(owner: string, repo: string, prNumber: number): string {
  return `https://github.com/${owner}/${repo}/pull/${prNumber}`;
}

export function getPRStatus(pr: GitHubPullRequest): string {
  if (pr.merged_at) {
    return "merged";
  }
  if (pr.state === "closed") {
    return "closed";
  }
  if (pr.draft) {
    return "draft";
  }
  return "open";
}
