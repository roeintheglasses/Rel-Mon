import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { searchJiraByText, searchJiraIssues } from "@/services/jira-client";

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
    const projectKey = searchParams.get("project");
    const jql = searchParams.get("jql");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!query && !jql) {
      return NextResponse.json(
        { error: "Either 'q' or 'jql' query parameter is required" },
        { status: 400 }
      );
    }

    let result;

    if (jql) {
      // Use raw JQL
      result = await searchJiraIssues(user.id, jql, limit);
    } else if (query) {
      // Text search
      result = await searchJiraByText(user.id, query, projectKey || undefined, limit);
    }

    // Transform to simpler format
    const issues = result?.issues.map((issue) => ({
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      statusCategory: issue.fields.status.statusCategory.key,
      issueType: issue.fields.issuetype.name,
      priority: issue.fields.priority?.name || null,
      assignee: issue.fields.assignee?.displayName || null,
      url: issue.self.replace("/rest/api/3/issue/", "/browse/").split("/rest")[0] + `/browse/${issue.key}`,
    })) || [];

    return NextResponse.json({
      issues,
      total: result?.total || 0,
    });
  } catch (error) {
    console.error("Jira search error:", error);

    if (error instanceof Error) {
      if (error.message === "Jira not connected") {
        return NextResponse.json(
          { error: "Jira not connected. Please connect your Jira account in settings." },
          { status: 401 }
        );
      }
      if (error.message === "No Jira site connected") {
        return NextResponse.json(
          { error: "No Jira site available. Please reconnect your Jira account." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to search Jira" },
      { status: 500 }
    );
  }
}
