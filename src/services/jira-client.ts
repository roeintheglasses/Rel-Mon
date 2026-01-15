import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/encryption";

const JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token";

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: {
      name: string;
      statusCategory: {
        key: string;
        name: string;
      };
    };
    assignee: {
      displayName: string;
      emailAddress: string;
      accountId: string;
    } | null;
    issuetype: {
      name: string;
      iconUrl: string;
    };
    priority: {
      name: string;
      iconUrl: string;
    } | null;
    created: string;
    updated: string;
  };
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
  maxResults: number;
  startAt: number;
}

interface OAuthConnection {
  id: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  cloudId: string | null;
  isValid: boolean;
}

async function refreshJiraToken(connection: OAuthConnection): Promise<string> {
  if (!connection.refreshToken) {
    throw new Error("No refresh token available");
  }

  const clientId = process.env.JIRA_CLIENT_ID;
  const clientSecret = process.env.JIRA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Jira OAuth not configured");
  }

  const decryptedRefreshToken = decryptToken(connection.refreshToken);

  const response = await fetch(JIRA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptedRefreshToken,
    }),
  });

  if (!response.ok) {
    // Mark connection as invalid
    await prisma.oAuthConnection.update({
      where: { id: connection.id },
      data: {
        isValid: false,
        lastErrorAt: new Date(),
        lastError: "Token refresh failed",
      },
    });
    throw new Error("Failed to refresh Jira token");
  }

  const tokens = await response.json();

  // Encrypt and store new tokens
  const encryptedAccessToken = encryptToken(tokens.access_token);
  const encryptedRefreshToken = tokens.refresh_token
    ? encryptToken(tokens.refresh_token)
    : connection.refreshToken;

  await prisma.oAuthConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      isValid: true,
      lastErrorAt: null,
      lastError: null,
    },
  });

  return tokens.access_token;
}

async function getValidAccessToken(userId: string): Promise<{ token: string; cloudId: string }> {
  const connection = await prisma.oAuthConnection.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: "JIRA",
      },
    },
  });

  if (!connection || !connection.isValid) {
    throw new Error("Jira not connected");
  }

  if (!connection.cloudId) {
    throw new Error("No Jira site connected");
  }

  let accessToken: string;

  // Check if token is expired or about to expire (within 5 minutes)
  const isExpired =
    connection.tokenExpiresAt &&
    connection.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000;

  if (isExpired && connection.refreshToken) {
    accessToken = await refreshJiraToken(connection);
  } else {
    accessToken = decryptToken(connection.accessToken);
  }

  // Update last used
  await prisma.oAuthConnection.update({
    where: { id: connection.id },
    data: { lastUsedAt: new Date() },
  });

  return { token: accessToken, cloudId: connection.cloudId };
}

export async function searchJiraIssues(
  userId: string,
  jql: string,
  maxResults: number = 50,
  startAt: number = 0
): Promise<JiraSearchResult> {
  const { token, cloudId } = await getValidAccessToken(userId);

  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        jql,
        maxResults,
        startAt,
        fields: [
          "summary",
          "status",
          "assignee",
          "issuetype",
          "priority",
          "created",
          "updated",
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Jira search failed:", errorText);

    if (response.status === 401) {
      // Mark connection as invalid
      const connection = await prisma.oAuthConnection.findUnique({
        where: {
          userId_provider: {
            userId,
            provider: "JIRA",
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
    }

    throw new Error("Failed to search Jira issues");
  }

  return response.json();
}

export async function getJiraIssue(
  userId: string,
  issueKey: string
): Promise<JiraIssue> {
  const { token, cloudId } = await getValidAccessToken(userId);

  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get Jira issue ${issueKey}`);
  }

  return response.json();
}

/**
 * Escapes special JQL characters to prevent injection attacks
 */
function escapeJql(value: string): string {
  // Escape backslashes first, then quotes
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function searchJiraByText(
  userId: string,
  searchText: string,
  projectKey?: string,
  maxResults: number = 20
): Promise<JiraSearchResult> {
  // Sanitize user input to prevent JQL injection
  let jql = `text ~ "${escapeJql(searchText)}"`;

  if (projectKey) {
    jql = `project = "${escapeJql(projectKey)}" AND ${jql}`;
  }

  jql += " ORDER BY updated DESC";

  return searchJiraIssues(userId, jql, maxResults);
}

export async function getJiraIssueUrl(userId: string, cloudId: string, issueKey: string): Promise<string> {
  // Get the resource URL from the connection, scoped to the user
  const connection = await prisma.oAuthConnection.findFirst({
    where: {
      userId,
      cloudId,
      provider: "JIRA",
    },
  });

  if (connection?.resourceUrl) {
    return `${connection.resourceUrl}/browse/${issueKey}`;
  }

  // Fallback
  return `https://atlassian.net/browse/${issueKey}`;
}
