"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { useReleases, Release } from "@/hooks/use-releases";
import { useDependencies } from "@/hooks/use-dependencies";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Link as LinkIcon,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Clock,
  Ban,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants/release";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const DEPENDENCY_TYPE_LABELS: Record<string, string> = {
  BLOCKS: "Blocks",
  SOFT_DEPENDENCY: "Soft Dependency",
  REQUIRES_SYNC: "Requires Sync",
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

// Separate component for lazy-loaded dependency content
function BlockedReleaseDependencies({ releaseId, blockedReason }: { releaseId: string; blockedReason: string | null }) {
  const { data: dependencies, isLoading: depsLoading, error: depsError } = useDependencies(releaseId);

  // Get unresolved blocking dependencies
  const blockingDeps = dependencies?.dependsOn?.filter(
    (d) => !d.isResolved && d.type === "BLOCKS"
  ) || [];

  return (
    <>
      {/* Manual blocked reason */}
      {blockedReason && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <div className="flex items-center gap-2 text-destructive font-medium text-sm mb-1">
            <Ban className="h-4 w-4" />
            Manual Block
          </div>
          <p className="text-sm">{blockedReason}</p>
        </div>
      )}

      {/* Blocking dependencies */}
      {depsError ? (
        <div className="text-sm text-destructive text-center py-4">
          Failed to load dependencies
        </div>
      ) : depsLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : blockingDeps.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Blocking Dependencies ({blockingDeps.length})
          </h4>
          <div className="space-y-2">
            {blockingDeps.map((dep) => (
              <div
                key={dep.id}
                className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: dep.release.service.color }}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {dep.release.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dep.release.service.name}
                      {dep.description && ` - ${dep.description}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={`${STATUS_COLORS[dep.release.status]} text-white text-xs`}
                  >
                    {STATUS_LABELS[dep.release.status]}
                  </Badge>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/releases/${dep.release.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !blockedReason ? (
        <div className="text-sm text-muted-foreground text-center py-2">
          No specific blocking dependencies found
        </div>
      ) : null}
    </>
  );
}

function BlockedReleaseCard({ release }: { release: Release }) {
  return (
    <AccordionItem value={release.id} className="border rounded-lg mb-3">
      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 rounded-t-lg">
        <div className="flex items-start gap-4 flex-1 text-left">
          {/* Service color indicator */}
          <div
            className="mt-1.5 h-3 w-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: release.service.color }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
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
                  variant="secondary"
                  className={`${STATUS_COLORS[release.status]} text-white`}
                >
                  {STATUS_LABELS[release.status]}
                </Badge>
                <Badge
                  variant="outline"
                  className={PRIORITY_COLORS[release.priority]}
                >
                  {release.priority}
                </Badge>
              </div>
            </div>

            {/* Blocked reason preview */}
            <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">
                {release.blockedReason || "Blocked by unresolved dependencies"}
              </span>
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {release.owner && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={release.owner.avatarUrl || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {getInitials(release.owner)}
                    </AvatarFallback>
                  </Avatar>
                  {getOwnerName(release.owner)}
                </div>
              )}
              {release.sprint && <span>{release.sprint.name}</span>}
              <span>
                Blocked {formatDistanceToNow(new Date(release.updatedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4 pt-2">
          {/* Lazy-loaded dependencies - only fetches when accordion is expanded */}
          <BlockedReleaseDependencies
            releaseId={release.id}
            blockedReason={release.blockedReason}
          />

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" asChild>
              <Link href={`/releases/${release.id}`}>
                View Release Details
                <ExternalLink className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function BlockedPage() {
  const {
    data: blockedReleases,
    isLoading,
    error,
  } = useReleases({
    isBlocked: true,
  });

  // Group by service
  const groupedByService = blockedReleases?.reduce((acc, release) => {
    const serviceId = release.service.id;
    if (!acc[serviceId]) {
      acc[serviceId] = {
        service: release.service,
        releases: [],
      };
    }
    acc[serviceId].releases.push(release);
    return acc;
  }, {} as Record<string, { service: Release["service"]; releases: Release[] }>);

  const serviceGroups = Object.values(groupedByService || {}).sort(
    (a, b) => b.releases.length - a.releases.length
  );

  // Count by priority
  const criticalCount = blockedReleases?.filter((r) => r.priority === "CRITICAL").length || 0;
  const highCount = blockedReleases?.filter((r) => r.priority === "HIGH").length || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Blocked Releases</h1>
          <p className="text-muted-foreground">
            Releases that are blocked by dependencies or manual flags
          </p>
        </div>
        {blockedReleases && blockedReleases.length > 0 && (
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {criticalCount} Critical
              </Badge>
            )}
            {highCount > 0 && (
              <Badge variant="outline" className="bg-orange-100 text-orange-700 gap-1">
                <AlertTriangle className="h-3 w-3" />
                {highCount} High
              </Badge>
            )}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load blocked releases</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && blockedReleases?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <h3 className="text-lg font-medium mb-2">No Blocked Releases</h3>
            <p className="text-muted-foreground">
              All releases are unblocked and moving forward. Great work!
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && blockedReleases && blockedReleases.length > 0 && (
        <div className="space-y-6">
          {/* Summary card */}
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-destructive">
                    {blockedReleases.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Blocked</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-600">{criticalCount}</p>
                  <p className="text-sm text-muted-foreground">Critical</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-orange-600">{highCount}</p>
                  <p className="text-sm text-muted-foreground">High Priority</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{serviceGroups.length}</p>
                  <p className="text-sm text-muted-foreground">Services Affected</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Releases by service */}
          {serviceGroups.map(({ service, releases }) => (
            <div key={service.id}>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: service.color }}
                />
                <h2 className="font-medium">
                  {service.name} ({releases.length})
                </h2>
              </div>
              <Accordion type="single" collapsible className="space-y-0">
                {releases.map((release) => (
                  <BlockedReleaseCard key={release.id} release={release} />
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
