import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { searchPRsByRepo, searchGitHubPRs, getPRStatus } from "@/services/github-client";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get internal user
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");

    // Validate state parameter
    const stateParam = searchParams.get("state") || "all";
    if (!["open", "closed", "all"].includes(stateParam)) {
      return NextResponse.json(
        { error: "Invalid state parameter. Must be 'open', 'closed', or 'all'" },
        { status: 400 }
      );
    }
    const state = stateParam as "open" | "closed" | "all";

    // Validate and sanitize limit parameter
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Number.isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100);

    if (!query && (!owner || !repo)) {
      return NextResponse.json(
        { error: "Either 'q' query or 'owner' and 'repo' parameters are required" },
        { status: 400 }
      );
    }

    let result;

    if (owner && repo) {
      // Search within a specific repo
      result = await searchPRsByRepo(user.id, owner, repo, query || undefined, state, limit);
    } else if (query) {
      // General search
      result = await searchGitHubPRs(user.id, query, limit);
    }

    // Transform to simpler format
    const pullRequests = result?.items.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: getPRStatus(pr),
      draft: pr.draft,
      url: pr.html_url,
      author: pr.user.login,
      authorAvatar: pr.user.avatar_url,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at,
      headBranch: pr.head?.ref,
      baseBranch: pr.base?.ref,
      labels: pr.labels?.map((l) => ({ name: l.name, color: l.color })) || [],
    })) || [];

    return NextResponse.json({
      pullRequests,
      total: result?.total_count || 0,
    });
  } catch (error) {
    console.error("GitHub search error:", error);

    if (error instanceof Error) {
      if (error.message === "GitHub not connected") {
        return NextResponse.json(
          { error: "GitHub not connected. Please connect your GitHub account in settings." },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to search GitHub" },
      { status: 500 }
    );
  }
}
