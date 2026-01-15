import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_SCOPES = ["repo", "read:user"];

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/github/callback`;

    if (!clientId) {
      return NextResponse.json(
        { error: "GitHub OAuth not configured" },
        { status: 500 }
      );
    }

    // Generate state for CSRF protection
    const state = randomBytes(32).toString("hex");

    // Store state in cookie for verification
    const cookieStore = await cookies();
    cookieStore.set("github_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: GITHUB_SCOPES.join(" "),
      state,
      allow_signup: "false",
    });

    const authUrl = `${GITHUB_AUTH_URL}?${params.toString()}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("GitHub OAuth authorize error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}
