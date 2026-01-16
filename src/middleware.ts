import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/invite/(.*)",
  "/api/webhooks/(.*)",
  "/api/invitations/(.*)",
]);

// Define routes that require an organization to be selected
const isOrgRoute = createRouteMatcher([
  "/board(.*)",
  "/releases(.*)",
  "/services(.*)",
  "/sprints(.*)",
  "/deployment-groups(.*)",
  "/my-releases(.*)",
  "/ready-to-deploy(.*)",
  "/blocked(.*)",
  "/settings(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect all other routes
  const { userId, orgId } = await auth.protect();

  // For org-scoped routes, ensure an organization is selected
  if (isOrgRoute(req) && !orgId) {
    const orgSelection = new URL("/select-org", req.url);
    return NextResponse.redirect(orgSelection);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
