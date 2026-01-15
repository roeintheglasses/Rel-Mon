"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Check,
  X,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface OAuthConnection {
  id: string;
  provider: "JIRA" | "GITHUB";
  providerEmail: string | null;
  providerUserId: string | null;
  resourceUrl: string | null;
  scopes: string[];
  isValid: boolean;
  lastUsedAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<OAuthConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();

    // Handle success/error from OAuth callback
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "jira") {
      toast.success("Successfully connected to Jira!");
    } else if (success === "github") {
      toast.success("Successfully connected to GitHub!");
    } else if (error) {
      const errorMessages: Record<string, string> = {
        unauthorized: "You must be logged in to connect integrations",
        missing_params: "OAuth callback was missing required parameters",
        invalid_state: "Invalid OAuth state. Please try again.",
        not_configured: "Integration is not configured. Contact your administrator.",
        token_exchange_failed: "Failed to exchange authorization code",
        user_not_found: "User account not found",
        callback_failed: "OAuth callback failed. Please try again.",
        access_denied: "Access was denied. Please try again.",
      };
      toast.error(errorMessages[error] || `OAuth error: ${error}`);
    }
  }, [searchParams]);

  const fetchConnections = async () => {
    try {
      const response = await fetch("/api/oauth/connections");
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async (provider: "JIRA" | "GITHUB") => {
    setDisconnecting(provider);
    try {
      const response = await fetch(`/api/oauth/connections?provider=${provider}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(`Disconnected from ${provider === "JIRA" ? "Jira" : "GitHub"}`);
        setConnections(connections.filter((c) => c.provider !== provider));
      } else {
        toast.error("Failed to disconnect");
      }
    } catch (error) {
      console.error("Failed to disconnect:", error);
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(null);
    }
  };

  const jiraConnection = connections.find((c) => c.provider === "JIRA");
  const githubConnection = connections.find((c) => c.provider === "GITHUB");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your Jira and GitHub accounts to link tickets and PRs to releases
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Jira Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-600" fill="currentColor">
                    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z"/>
                  </svg>
                </div>
                <div>
                  <CardTitle>Jira</CardTitle>
                  <CardDescription>Link Jira tickets to releases</CardDescription>
                </div>
              </div>
              {jiraConnection && (
                <Badge variant={jiraConnection.isValid ? "default" : "destructive"}>
                  {jiraConnection.isValid ? (
                    <>
                      <Check className="mr-1 h-3 w-3" />
                      Connected
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Error
                    </>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : jiraConnection ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Account:</span>
                    <span className="font-medium">{jiraConnection.providerEmail || "Connected"}</span>
                  </div>
                  {jiraConnection.resourceUrl && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-muted-foreground">Site:</span>
                      <a
                        href={jiraConnection.resourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        {new URL(jiraConnection.resourceUrl).hostname}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {jiraConnection.lastUsedAt && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-muted-foreground">Last used:</span>
                      <span>{format(new Date(jiraConnection.lastUsedAt), "MMM d, yyyy")}</span>
                    </div>
                  )}
                </div>

                {!jiraConnection.isValid && jiraConnection.lastError && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{jiraConnection.lastError}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {!jiraConnection.isValid && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.location.href = "/api/oauth/jira/authorize"}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reconnect
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className={jiraConnection.isValid ? "flex-1" : ""}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Jira?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove your Jira connection. You will no longer be able to link Jira tickets to releases until you reconnect.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDisconnect("JIRA")}
                          disabled={disconnecting === "JIRA"}
                        >
                          {disconnecting === "JIRA" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Connect your Jira account to search and link tickets to your releases.
                </p>
                <Button
                  className="w-full"
                  onClick={() => window.location.href = "/api/oauth/jira/authorize"}
                >
                  Connect Jira
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* GitHub Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </div>
                <div>
                  <CardTitle>GitHub</CardTitle>
                  <CardDescription>Link pull requests to releases</CardDescription>
                </div>
              </div>
              {githubConnection && (
                <Badge variant={githubConnection.isValid ? "default" : "destructive"}>
                  {githubConnection.isValid ? (
                    <>
                      <Check className="mr-1 h-3 w-3" />
                      Connected
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Error
                    </>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : githubConnection ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Account:</span>
                    <span className="font-medium">{githubConnection.providerEmail || "Connected"}</span>
                  </div>
                  {githubConnection.lastUsedAt && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-muted-foreground">Last used:</span>
                      <span>{format(new Date(githubConnection.lastUsedAt), "MMM d, yyyy")}</span>
                    </div>
                  )}
                </div>

                {!githubConnection.isValid && githubConnection.lastError && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{githubConnection.lastError}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {!githubConnection.isValid && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.location.href = "/api/oauth/github/authorize"}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reconnect
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className={githubConnection.isValid ? "flex-1" : ""}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect GitHub?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove your GitHub connection. You will no longer be able to link pull requests to releases until you reconnect.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDisconnect("GITHUB")}
                          disabled={disconnecting === "GITHUB"}
                        >
                          {disconnecting === "GITHUB" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Connect your GitHub account to search and link pull requests to your releases.
                </p>
                <Button
                  className="w-full"
                  onClick={() => window.location.href = "/api/oauth/github/authorize"}
                >
                  Connect GitHub
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <div className="mt-8 rounded-lg border bg-muted/30 p-4">
        <h3 className="font-medium mb-2">About Integrations</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
            <span>Integrations are personal - each team member connects their own accounts</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
            <span>Your tokens are encrypted at rest and only used to access data you authorize</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
            <span>You can disconnect at any time to revoke access</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function IntegrationsLoading() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your Jira and GitHub accounts to link tickets and PRs to releases
        </p>
      </div>
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<IntegrationsLoading />}>
      <IntegrationsContent />
    </Suspense>
  );
}
