"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useInvitationByToken, useAcceptInvitation } from "@/hooks/use-invitations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Users,
  Check,
  AlertCircle,
  Clock,
  LogIn,
} from "lucide-react";

const ROLE_DESCRIPTIONS = {
  ADMIN: "Full access to manage team settings and members",
  MEMBER: "Create and manage releases",
  VIEWER: "Read-only access to releases and dashboards",
};

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const { isLoaded, isSignedIn, user } = useUser();
  const { data: invitation, isLoading, error } = useInvitationByToken(token);
  const acceptInvitation = useAcceptInvitation();
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const handleAccept = async () => {
    setAcceptError(null);
    try {
      const result = await acceptInvitation.mutateAsync(token);
      if (result.success) {
        // Redirect to the dashboard after successful acceptance
        router.push("/");
      }
    } catch (err) {
      setAcceptError(
        err instanceof Error ? err.message : "Failed to accept invitation"
      );
    }
  };

  // Auto-redirect if already a member
  useEffect(() => {
    if (acceptInvitation.data?.alreadyMember) {
      router.push("/");
    }
  }, [acceptInvitation.data, router]);

  // Show loading state
  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error || !invitation) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "This invitation is invalid or has expired";

    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => router.push("/")}>
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Join {invitation.team.name}</CardTitle>
            <CardDescription>
              You&apos;ve been invited to join {invitation.team.name} as a{" "}
              <Badge variant="secondary" className="ml-1">
                {invitation.role}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                <LogIn className="h-4 w-4 inline mr-2" />
                Sign in or create an account to accept this invitation
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Invitation sent to: {invitation.email}
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <SignInButton
              mode="modal"
              fallbackRedirectUrl={`/invite/${token}`}
            >
              <Button className="w-full">Sign In</Button>
            </SignInButton>
            <SignUpButton
              mode="modal"
              fallbackRedirectUrl={`/invite/${token}`}
            >
              <Button variant="outline" className="w-full">
                Create Account
              </Button>
            </SignUpButton>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Note: Email validation is handled server-side in the accept endpoint
  // The public API returns a masked email for privacy, so we can't compare here

  // Show accept invitation UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Join {invitation.team.name}</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join this team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Team</span>
              <span className="font-medium">{invitation.team.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Your Role</span>
              <Badge variant="secondary">{invitation.role}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Expires</span>
              <span className="text-sm flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(invitation.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              <strong>{invitation.role}</strong>:{" "}
              {ROLE_DESCRIPTIONS[invitation.role]}
            </p>
          </div>

          {acceptError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
              {acceptError}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={handleAccept}
            disabled={acceptInvitation.isPending}
          >
            {acceptInvitation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Accept Invitation
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/")}
          >
            Decline
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
