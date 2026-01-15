"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  AlertTriangle,
  Link as LinkIcon,
  ExternalLink,
  Loader2,
  PackagePlus,
  Filter,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning",
  IN_DEVELOPMENT: "In Development",
  IN_REVIEW: "In Review",
  READY_STAGING: "Ready for Staging",
  IN_STAGING: "In Staging",
  STAGING_VERIFIED: "Staging Verified",
  READY_PRODUCTION: "Ready for Production",
  DEPLOYED: "Deployed",
  CANCELLED: "Cancelled",
  ROLLED_BACK: "Rolled Back",
};

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-slate-500",
  IN_DEVELOPMENT: "bg-blue-500",
  IN_REVIEW: "bg-purple-500",
  READY_STAGING: "bg-yellow-500",
  IN_STAGING: "bg-orange-500",
  STAGING_VERIFIED: "bg-teal-500",
  READY_PRODUCTION: "bg-green-500",
  DEPLOYED: "bg-emerald-600",
  CANCELLED: "bg-gray-500",
  ROLLED_BACK: "bg-red-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

function ReleaseListItem({ release }: { release: Release }) {
  const dependencyCount =
    (release._count?.dependsOn || 0) + (release._count?.dependents || 0);

  return (
    <Link href={`/releases/${release.id}`} className="block">
      <Card className="hover:shadow-md hover:border-primary/50 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Service color indicator */}
            <div
              className="mt-1.5 h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: release.service.color }}
            />

            <div className="flex-1 min-w-0">
              {/* Title and version */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-base line-clamp-1">
                    {release.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {release.service.name}
                    {release.version && (
                      <span className="ml-2">v{release.version}</span>
                    )}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>

              {/* Status and metadata row */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {/* Status badge */}
                <Badge
                  variant="secondary"
                  className={`${STATUS_COLORS[release.status]} text-white`}
                >
                  {STATUS_LABELS[release.status]}
                </Badge>

                {/* Priority */}
                <Badge
                  variant="outline"
                  className={PRIORITY_COLORS[release.priority]}
                >
                  {release.priority}
                </Badge>

                {/* Hotfix indicator */}
                {release.isHotfix && (
                  <Badge variant="destructive">Hotfix</Badge>
                )}

                {/* Blocked indicator */}
                {release.isBlocked && (
                  <Badge
                    variant="destructive"
                    className="gap-1"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Blocked
                  </Badge>
                )}

                {/* Dependencies */}
                {dependencyCount > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <LinkIcon className="h-3 w-3" />
                    {dependencyCount} dep{dependencyCount !== 1 ? "s" : ""}
                  </div>
                )}

                {/* Target date */}
                {release.targetDate && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(release.targetDate), "MMM d")}
                  </div>
                )}

                {/* Sprint */}
                {release.sprint && (
                  <div className="text-xs text-muted-foreground">
                    {release.sprint.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

type StatusFilter = "all" | "active" | "deployed" | "cancelled";

export default function MyReleasesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  // Determine which statuses to fetch based on filter
  const getStatuses = () => {
    switch (statusFilter) {
      case "active":
        return [
          "PLANNING",
          "IN_DEVELOPMENT",
          "IN_REVIEW",
          "READY_STAGING",
          "IN_STAGING",
          "STAGING_VERIFIED",
          "READY_PRODUCTION",
        ];
      case "deployed":
        return ["DEPLOYED"];
      case "cancelled":
        return ["CANCELLED", "ROLLED_BACK"];
      default:
        return undefined;
    }
  };

  const statuses = getStatuses();
  const { data: releases, isLoading, error } = useReleases({
    mine: true,
    statuses,
  });

  // Group releases by status for active filter
  const groupedReleases = releases?.reduce((acc, release) => {
    const status = release.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(release);
    return acc;
  }, {} as Record<string, Release[]>);

  // Status order for display
  const statusOrder = [
    "READY_PRODUCTION",
    "STAGING_VERIFIED",
    "IN_STAGING",
    "READY_STAGING",
    "IN_REVIEW",
    "IN_DEVELOPMENT",
    "PLANNING",
    "DEPLOYED",
    "CANCELLED",
    "ROLLED_BACK",
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Releases</h1>
          <p className="text-muted-foreground">
            Releases you own ({releases?.length || 0} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Releases</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="deployed">Deployed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild>
            <Link href="/releases/new">
              <PackagePlus className="h-4 w-4 mr-2" />
              New Release
            </Link>
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load releases</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && releases?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <PackagePlus className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No releases found</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter === "all"
                ? "You don't own any releases yet."
                : `No ${statusFilter} releases found.`}
            </p>
            <Button asChild>
              <Link href="/releases/new">
                <PackagePlus className="h-4 w-4 mr-2" />
                Create Your First Release
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && releases && releases.length > 0 && (
        <div className="space-y-6">
          {statusOrder.map((status) => {
            const statusReleases = groupedReleases?.[status];
            if (!statusReleases || statusReleases.length === 0) return null;

            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`h-2 w-2 rounded-full ${STATUS_COLORS[status]}`}
                  />
                  <h2 className="font-medium text-sm text-muted-foreground">
                    {STATUS_LABELS[status]} ({statusReleases.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {statusReleases.map((release) => (
                    <ReleaseListItem key={release.id} release={release} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
