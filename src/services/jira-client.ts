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

/**
 * Refreshes an expired Jira OAuth token using the refresh token
 * @param connection - The OAuth connection object with refresh token
 * @returns The new decrypted access token
 * @throws Error if refresh token is missing or refresh fails
 */
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

  // Validate token response structure
  if (!tokens.access_token || typeof tokens.access_token !== "string") {
    await prisma.oAuthConnection.update({
      where: { id: connection.id },
      data: {
        isValid: false,
        lastErrorAt: new Date(),
        lastError: "Invalid token response from Jira",
      },
    });
    throw new Error("Invalid token response from Jira");
  }

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

/**
 * Gets a valid Jira access token for the user, refreshing if expired
 * @param userId - The ID of the user
 * @returns Object containing the decrypted access token and cloud ID
 * @throws Error if Jira is not connected or token cannot be refreshed
 */
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

  if (isExpired) {
    if (!connection.refreshToken) {
      // Token is expired and no refresh token available - fail fast
      await prisma.oAuthConnection.update({
        where: { id: connection.id },
        data: {
          isValid: false,
          lastErrorAt: new Date(),
          lastError: "Token expired and no refresh token available",
        },
      });
      throw new Error("Jira token expired. Please reconnect your Jira account.");
    }
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

/**
 * Searches Jira issues using JQL (Jira Query Language)
 * @param userId - The ID of the user performing the search
 * @param jql - The JQL query string
 * @param maxResults - Maximum number of results to return (default: 50)
 * @param startAt - Pagination offset (default: 0)
 * @returns Search results containing issues, total count, and pagination info
 * @throws Error if authentication fails or search request fails
 */
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

/**
 * Gets a single Jira issue by its key
 * @param userId - The ID of the user
 * @param issueKey - The Jira issue key (e.g., "PROJ-123")
 * @returns The Jira issue with all fields
 * @throws Error if issue not found or request fails
 */
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
    // Handle 401 consistently with searchJiraIssues - mark connection as invalid
    if (response.status === 401) {
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
    throw new Error(`Failed to get Jira issue ${issueKey}`);
  }

  return response.json();
}

/**
 * Escapes special JQL characters to prevent injection attacks
 * @param value - The string value to escape
 * @returns The escaped string safe for use in JQL queries
 */
function escapeJql(value: string): string {
  // Escape backslashes first, then quotes
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Searches Jira issues by text with optional project filtering
 * @param userId - The ID of the user performing the search
 * @param searchText - The text to search for in issues
 * @param projectKey - Optional project key to limit search scope
 * @param maxResults - Maximum number of results to return (default: 20)
 * @returns Search results containing matching issues
 */
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

/**
 * Gets the full URL for a Jira issue
 * @param userId - The ID of the user
 * @param cloudId - The Jira cloud ID
 * @param issueKey - The Jira issue key (e.g., "PROJ-123")
 * @returns The full URL to view the issue in Jira
 */
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

  // No resourceUrl available - cannot construct valid Jira URL without tenant subdomain
  throw new Error(`Unable to construct Jira URL: no resource URL configured for cloud ID ${cloudId}`);
}
