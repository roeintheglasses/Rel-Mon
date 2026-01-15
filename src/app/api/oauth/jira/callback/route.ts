import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/encryption";

const JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const JIRA_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources";
const JIRA_USER_URL = "https://api.atlassian.com/me";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface JiraResource {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl: string;
}

interface JiraUser {
  account_id: string;
  email: string;
  name: string;
  picture: string;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=unauthorized`
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("Jira OAuth error:", error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=missing_params`
      );
    }

    // Verify state
    const cookieStore = await cookies();
    const storedState = cookieStore.get("jira_oauth_state")?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=invalid_state`
      );
    }

    // Clear state cookie
    cookieStore.delete("jira_oauth_state");

    const clientId = process.env.JIRA_CLIENT_ID;
    const clientSecret = process.env.JIRA_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/jira/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=not_configured`
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(JIRA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=token_exchange_failed`
      );
    }

    const tokens: TokenResponse = await tokenResponse.json();

    // Get accessible resources (Jira sites)
    const resourcesResponse = await fetch(JIRA_RESOURCES_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/json",
      },
    });

    let cloudId: string | null = null;
    let resourceUrl: string | null = null;

    if (resourcesResponse.ok) {
      const resources: JiraResource[] = await resourcesResponse.json();
      if (resources.length > 0) {
        cloudId = resources[0].id;
        resourceUrl = resources[0].url;
      }
    }

    // Get user info
    const userResponse = await fetch(JIRA_USER_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/json",
      },
    });

    let providerUserId: string | null = null;
    let providerEmail: string | null = null;

    if (userResponse.ok) {
      const user: JiraUser = await userResponse.json();
      providerUserId = user.account_id;
      providerEmail = user.email;
    }

    // Get internal user ID
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=user_not_found`
      );
    }

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : null;

    // Upsert OAuth connection
    await prisma.oAuthConnection.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: "JIRA",
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
        providerUserId,
        providerEmail,
        cloudId,
        resourceUrl,
        scopes: tokens.scope.split(" "),
        isValid: true,
        lastErrorAt: null,
        lastError: null,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        provider: "JIRA",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
        providerUserId,
        providerEmail,
        cloudId,
        resourceUrl,
        scopes: tokens.scope.split(" "),
        isValid: true,
      },
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?success=jira`
    );
  } catch (error) {
    console.error("Jira OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=callback_failed`
    );
  }
}
