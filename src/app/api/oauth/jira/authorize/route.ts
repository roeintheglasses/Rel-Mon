import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

const JIRA_AUTH_URL = "https://auth.atlassian.com/authorize";
const JIRA_SCOPES = [
  "read:jira-work",
  "read:jira-user",
  "offline_access",
  "read:me",
];

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.JIRA_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!clientId || !appUrl) {
      return NextResponse.json(
        { error: "Jira OAuth not configured" },
        { status: 500 }
      );
    }

    const redirectUri = `${appUrl}/api/oauth/jira/callback`;

    // Generate state for CSRF protection
    const state = randomBytes(32).toString("hex");

    // Store state in cookie for verification
    const cookieStore = await cookies();
    cookieStore.set("jira_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    // Build authorization URL
    const params = new URLSearchParams({
      audience: "api.atlassian.com",
      client_id: clientId,
      scope: JIRA_SCOPES.join(" "),
      redirect_uri: redirectUri,
      state,
      response_type: "code",
      prompt: "consent",
    });

    const authUrl = `${JIRA_AUTH_URL}?${params.toString()}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Jira OAuth authorize error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}
