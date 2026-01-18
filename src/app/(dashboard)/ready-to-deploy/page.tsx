"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { useReleases, Release } from "@/hooks/use-releases";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Rocket,
  Server,
  ArrowRight,
  AlertTriangle,
  Link as LinkIcon,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Clock,
} from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

function getOwnerName(owner: Release["owner"] | null) {
  if (!owner) return "Unknown";
  if (owner.firstName || owner.lastName) {
    return `${owner.firstName || ""} ${owner.lastName || ""}`.trim();
  }
  return owner.email;
}

function getInitials(owner: Release["owner"] | null) {
  if (!owner) return "??";
  if (owner.firstName || owner.lastName) {
    return `${owner.firstName?.[0] || ""}${owner.lastName?.[0] || ""}`.toUpperCase();
  }
  return owner.email.slice(0, 2).toUpperCase();
}

function DeployableReleaseCard({ release }: { release: Release }) {
  const dependencyCount =
    (release._count?.dependsOn || 0) + (release._count?.dependents || 0);

  return (
    <Link href={`/releases/${release.id}`} className="block">
      <Card className="hover:shadow-md hover:border-primary/50 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Service color indicator */}
            <div
              className="mt-1 h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: release.service.color }}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-medium line-clamp-1">{release.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {release.service.name}
                    {release.version && (
                      <span className="ml-2">v{release.version}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={PRIORITY_COLORS[release.priority]}
                  >
                    {release.priority}
                  </Badge>
                  {release.isHotfix && (
                    <Badge variant="destructive">Hotfix</Badge>
                  )}
                </div>
              </div>

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {/* Owner */}
                {release.owner && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={release.owner.avatarUrl || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(release.owner)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-muted-foreground">
                          {getOwnerName(release.owner)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Release Owner</TooltipContent>
                  </Tooltip>
                )}

                {/* Dependencies */}
                {dependencyCount > 0 && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <LinkIcon className="h-3.5 w-3.5" />
                    {dependencyCount}
                  </div>
                )}

                {/* Ready since */}
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Ready {formatDistanceToNow(new Date(release.updatedAt), { addSuffix: true })}
                </div>

                {/* Sprint */}
                {release.sprint && (
                  <div className="text-muted-foreground">
                    {release.sprint.name}
                  </div>
                )}
              </div>

              {/* Blocked warning */}
              {release.isBlocked && (
                <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Blocked: {release.blockedReason || "Dependencies not met"}</span>
                </div>
              )}
            </div>

            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ReadyToDeployPage() {
  // Fetch releases ready for staging
  const {
    data: stagingReleases,
    isLoading: stagingLoading,
    error: stagingError,
  } = useReleases({
    statuses: ["READY_STAGING"],
  });

  // Fetch releases ready for production
  const {
    data: productionReleases,
    isLoading: productionLoading,
    error: productionError,
  } = useReleases({
    statuses: ["READY_PRODUCTION"],
  });

  // Fetch releases that have been verified in staging
  const {
    data: verifiedReleases,
    isLoading: verifiedLoading,
    error: verifiedError,
  } = useReleases({
    statuses: ["STAGING_VERIFIED"],
  });

  const isLoading = stagingLoading || productionLoading || verifiedLoading;
  const hasError = stagingError || productionError || verifiedError;

  // Combine staging verified with production ready for the production section
  const allProductionReady = [
    ...(productionReleases || []),
    ...(verifiedReleases || []),
  ].sort((a, b) => {
    // Sort by priority (CRITICAL first), then by date
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const aPriority = priorityOrder[a.priority] ?? 2;
    const bPriority = priorityOrder[b.priority] ?? 2;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Sort staging releases by priority
  const sortedStagingReleases = (stagingReleases || []).sort((a, b) => {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const aPriority = priorityOrder[a.priority] ?? 2;
    const bPriority = priorityOrder[b.priority] ?? 2;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Filter out blocked releases for counts
  const stagingUnblocked = sortedStagingReleases.filter((r) => !r.isBlocked);
  const productionUnblocked = allProductionReady.filter((r) => !r.isBlocked);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ready to Deploy</h1>
        <p className="text-muted-foreground">
          Releases that are ready for staging or production deployment
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {hasError && (
        <Card className="border-destructive">
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load releases</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !hasError && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Ready for Staging */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-lg">Ready for Staging</CardTitle>
              </div>
              <CardDescription>
                {stagingUnblocked.length} release{stagingUnblocked.length !== 1 ? "s" : ""} ready to deploy to staging
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {sortedStagingReleases.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8" />
                  <p>No releases waiting for staging</p>
                </div>
              ) : (
                sortedStagingReleases.map((release) => (
                  <DeployableReleaseCard key={release.id} release={release} />
                ))
              )}
            </CardContent>
          </Card>

          {/* Ready for Production */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-green-500" />
                <CardTitle className="text-lg">Ready for Production</CardTitle>
              </div>
              <CardDescription>
                {productionUnblocked.length} release{productionUnblocked.length !== 1 ? "s" : ""} ready to deploy to production
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {allProductionReady.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8" />
                  <p>No releases waiting for production</p>
                </div>
              ) : (
                allProductionReady.map((release) => (
                  <DeployableReleaseCard key={release.id} release={release} />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary stats */}
      {!isLoading && !hasError && (
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Ready</p>
                  <p className="text-2xl font-bold">
                    {sortedStagingReleases.length + allProductionReady.length}
                  </p>
                </div>
                <Rocket className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Staging Queue</p>
                  <p className="text-2xl font-bold">{sortedStagingReleases.length}</p>
                </div>
                <Server className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Production Queue</p>
                  <p className="text-2xl font-bold">{allProductionReady.length}</p>
                </div>
                <Rocket className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Blocked</p>
                  <p className="text-2xl font-bold">
                    {(sortedStagingReleases.length - stagingUnblocked.length) +
                      (allProductionReady.length - productionUnblocked.length)}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
