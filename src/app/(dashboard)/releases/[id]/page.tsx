"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { useRelease, useUpdateRelease, useDeleteRelease } from "@/hooks/use-releases";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  GitBranch,
  Layers,
  Loader2,
  MoreVertical,
  Package,
  Tag,
  Trash2,
  User,
  AlertCircle,
  Link as LinkIcon,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { ActivityTimeline } from "@/components/releases/activity-timeline";
import { CommentsSection } from "@/components/releases/comments-section";
import { TooltipProvider } from "@/components/ui/tooltip";

const STATUS_OPTIONS = [
  { value: "PLANNING", label: "Planning" },
  { value: "IN_DEVELOPMENT", label: "In Development" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "READY_STAGING", label: "Ready for Staging" },
  { value: "IN_STAGING", label: "In Staging" },
  { value: "STAGING_VERIFIED", label: "Staging Verified" },
  { value: "READY_PRODUCTION", label: "Ready for Production" },
  { value: "DEPLOYED", label: "Deployed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ROLLED_BACK", label: "Rolled Back" },
];

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-slate-500",
  IN_DEVELOPMENT: "bg-blue-500",
  IN_REVIEW: "bg-purple-500",
  READY_STAGING: "bg-yellow-500",
  IN_STAGING: "bg-orange-500",
  STAGING_VERIFIED: "bg-cyan-500",
  READY_PRODUCTION: "bg-green-500",
  DEPLOYED: "bg-emerald-600",
  CANCELLED: "bg-gray-500",
  ROLLED_BACK: "bg-red-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-500",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-500",
};

function getInitials(firstName: string | null, lastName: string | null, email: string) {
  if (firstName || lastName) {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function getUserName(firstName: string | null, lastName: string | null, email: string) {
  if (firstName || lastName) {
    return `${firstName || ""} ${lastName || ""}`.trim();
  }
  return email;
}

export default function ReleaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const releaseId = params.id as string;

  const { data: release, isLoading, error } = useRelease(releaseId);
  const updateRelease = useUpdateRelease();
  const deleteRelease = useDeleteRelease();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateRelease.mutateAsync({
        id: releaseId,
        data: { status: newStatus as any },
      });
      toast.success(`Status updated to ${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRelease.mutateAsync(releaseId);
      toast.success("Release deleted");
      router.push("/board");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete release");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !release) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium">Release not found</h2>
        <p className="text-muted-foreground mb-4">The release you&apos;re looking for doesn&apos;t exist.</p>
        <Button variant="outline" asChild>
          <Link href="/board">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Board
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/board">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Board
            </Link>
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: release.service.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {release.service.name}
                </span>
                {release.version && (
                  <>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-sm font-mono">{release.version}</span>
                  </>
                )}
              </div>
              <h1 className="text-2xl font-bold">{release.title}</h1>
              {release.description && (
                <p className="text-muted-foreground mt-2">{release.description}</p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/releases/${releaseId}/edit`}>
                    Edit Release
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Release
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Status and Priority */}
          <div className="flex items-center gap-4 mt-4">
            <Select value={release.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[200px]">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${STATUS_COLORS[release.status]}`} />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${STATUS_COLORS[status.value]}`} />
                      {status.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Badge variant="secondary" className="gap-1">
              <div className={`h-2 w-2 rounded-full ${PRIORITY_COLORS[release.priority]}`} />
              {release.priority}
            </Badge>

            {release.isHotfix && (
              <Badge variant="destructive">Hotfix</Badge>
            )}

            {release.isBlocked && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Blocked
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="activity">
              <TabsList>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                <TabsTrigger value="items">
                  Items
                  {release.items && release.items.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 justify-center">
                      {release.items.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="mt-4">
                <ActivityTimeline releaseId={releaseId} />
              </TabsContent>

              <TabsContent value="comments" className="mt-4">
                <CommentsSection releaseId={releaseId} />
              </TabsContent>

              <TabsContent value="items" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LinkIcon className="h-5 w-5" />
                      Linked Items
                    </CardTitle>
                    <CardDescription>
                      Jira tickets and GitHub PRs linked to this release
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {release.items && release.items.length > 0 ? (
                      <div className="space-y-3">
                        {release.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">
                                {item.type === "JIRA_TICKET" ? "Jira" : "GitHub PR"}
                              </Badge>
                              <div>
                                <p className="font-medium">
                                  {item.title || item.externalId}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {item.externalId}
                                  {item.status && (
                                    <span className="ml-2">• {item.status}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            {item.externalUrl && (
                              <Button variant="ghost" size="icon" asChild>
                                <a
                                  href={item.externalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No items linked yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dependencies" className="mt-4">
                <div className="space-y-4">
                  {/* Blocking releases (this release depends on) */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        Blocked By
                      </CardTitle>
                      <CardDescription>
                        Releases that must be completed before this one
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {release.dependsOn && release.dependsOn.length > 0 ? (
                        <div className="space-y-2">
                          {release.dependsOn.map((dep) => (
                            <Link
                              key={dep.blockingRelease.id}
                              href={`/releases/${dep.blockingRelease.id}`}
                              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: dep.blockingRelease.service?.color }}
                                />
                                <div>
                                  <p className="font-medium">{dep.blockingRelease.title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {dep.blockingRelease.service?.name}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={dep.blockingRelease.status === "DEPLOYED" ? "default" : "secondary"}>
                                {STATUS_OPTIONS.find(s => s.value === dep.blockingRelease.status)?.label}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">
                          No blocking dependencies
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Dependent releases (blocked by this release) */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GitBranch className="h-5 w-5" />
                        Blocking
                      </CardTitle>
                      <CardDescription>
                        Releases waiting on this one to complete
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {release.dependents && release.dependents.length > 0 ? (
                        <div className="space-y-2">
                          {release.dependents.map((dep) => (
                            <Link
                              key={dep.dependentRelease.id}
                              href={`/releases/${dep.dependentRelease.id}`}
                              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: dep.dependentRelease.service?.color }}
                                />
                                <div>
                                  <p className="font-medium">{dep.dependentRelease.title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {dep.dependentRelease.service?.name}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary">
                                {STATUS_OPTIONS.find(s => s.value === dep.dependentRelease.status)?.label}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">
                          No releases are waiting on this one
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Owner
                  </span>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={release.owner?.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {release.owner
                          ? getInitials(release.owner.firstName, release.owner.lastName, release.owner.email)
                          : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {release.owner
                        ? getUserName(release.owner.firstName, release.owner.lastName, release.owner.email)
                        : "Unassigned"}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Service
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: release.service.color }}
                    />
                    <span className="text-sm font-medium">{release.service.name}</span>
                  </div>
                </div>

                {release.sprint && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Sprint
                      </span>
                      <span className="text-sm font-medium">{release.sprint.name}</span>
                    </div>
                  </>
                )}

                {release.version && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Version
                      </span>
                      <span className="text-sm font-mono">{release.version}</span>
                    </div>
                  </>
                )}

                {release.targetDate && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Target Date
                      </span>
                      <span className="text-sm font-medium">
                        {format(new Date(release.targetDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Blocked Reason */}
            {release.isBlocked && release.blockedReason && (
              <Card className="border-destructive">
                <CardHeader className="pb-2">
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Blocked
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{release.blockedReason}</p>
                </CardContent>
              </Card>
            )}

            {/* Timestamps */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>
                    {formatDistanceToNow(new Date(release.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span>
                    {formatDistanceToNow(new Date(release.updatedAt), { addSuffix: true })}
                  </span>
                </div>
                {release.stagingDeployedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Staging Deploy</span>
                    <span>
                      {format(new Date(release.stagingDeployedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                {release.prodDeployedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prod Deploy</span>
                    <span>
                      {format(new Date(release.prodDeployedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Release</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{release.title}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleteRelease.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
