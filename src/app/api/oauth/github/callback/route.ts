import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/encryption";

const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string;
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
      console.error("GitHub OAuth error:", error);
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
    const storedState = cookieStore.get("github_oauth_state")?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=invalid_state`
      );
    }

    // Clear state cookie
    cookieStore.delete("github_oauth_state");

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=not_configured`
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
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

    if (tokens.error) {
      console.error("GitHub token error:", tokens.error_description);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=${tokens.error}`
      );
    }

    // Get user info
    const userResponse = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    let providerUserId: string | null = null;
    let providerEmail: string | null = null;

    if (userResponse.ok) {
      const user: GitHubUser = await userResponse.json();
      providerUserId = user.id.toString();
      providerEmail = user.email;

      // If email is not public, try to get it from the emails endpoint
      if (!providerEmail) {
        const emailsResponse = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });

        if (emailsResponse.ok) {
          const emails = await emailsResponse.json();
          const primaryEmail = emails.find(
            (e: { primary: boolean; email: string }) => e.primary
          );
          if (primaryEmail) {
            providerEmail = primaryEmail.email;
          }
        }
      }
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

    // Encrypt token before storing (GitHub tokens don't expire by default)
    const encryptedAccessToken = encryptToken(tokens.access_token);

    // Upsert OAuth connection
    await prisma.oAuthConnection.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: "GITHUB",
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: null, // GitHub doesn't use refresh tokens for OAuth Apps
        tokenExpiresAt: null, // GitHub tokens don't expire
        providerUserId,
        providerEmail,
        cloudId: null,
        resourceUrl: "https://github.com",
        scopes: tokens.scope.split(",").map((s) => s.trim()),
        isValid: true,
        lastErrorAt: null,
        lastError: null,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        provider: "GITHUB",
        accessToken: encryptedAccessToken,
        refreshToken: null,
        tokenExpiresAt: null,
        providerUserId,
        providerEmail,
        cloudId: null,
        resourceUrl: "https://github.com",
        scopes: tokens.scope.split(",").map((s) => s.trim()),
        isValid: true,
      },
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?success=github`
    );
  } catch (error) {
    console.error("GitHub OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=callback_failed`
    );
  }
}
