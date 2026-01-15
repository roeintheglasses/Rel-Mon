"use client";

import { format, formatDistanceToNow } from "date-fns";
import { useActivities, Activity } from "@/hooks/use-activities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  History,
  Loader2,
  PlusCircle,
  RefreshCw,
  GitBranch,
  Link,
  MessageSquare,
  Users,
  Layers,
  Trash2,
  CheckCircle,
} from "lucide-react";

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  RELEASE_CREATED: <PlusCircle className="h-4 w-4 text-green-500" />,
  RELEASE_UPDATED: <RefreshCw className="h-4 w-4 text-blue-500" />,
  STATUS_CHANGED: <GitBranch className="h-4 w-4 text-purple-500" />,
  ITEM_ADDED: <Link className="h-4 w-4 text-blue-500" />,
  ITEM_REMOVED: <Trash2 className="h-4 w-4 text-orange-500" />,
  DEPENDENCY_ADDED: <Layers className="h-4 w-4 text-yellow-500" />,
  DEPENDENCY_RESOLVED: <CheckCircle className="h-4 w-4 text-green-500" />,
  COMMENT_ADDED: <MessageSquare className="h-4 w-4 text-blue-500" />,
  DEPLOYMENT_GROUP_ASSIGNED: <Layers className="h-4 w-4 text-purple-500" />,
  USER_ASSIGNED: <Users className="h-4 w-4 text-teal-500" />,
};

function getInitials(
  firstName: string | null,
  lastName: string | null,
  email: string
) {
  if (firstName || lastName) {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function getUserName(
  firstName: string | null,
  lastName: string | null,
  email: string
) {
  if (firstName || lastName) {
    return `${firstName || ""} ${lastName || ""}`.trim();
  }
  return email;
}

interface ActivityItemProps {
  activity: Activity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const icon = ACTIVITY_ICONS[activity.type] || (
    <History className="h-4 w-4 text-muted-foreground" />
  );

  return (
    <div className="flex gap-3 text-sm">
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
        <div className="flex-1 w-px bg-border" />
      </div>

      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2">
          {activity.user ? (
            <>
              <Avatar className="h-5 w-5">
                <AvatarImage src={activity.user.avatarUrl || undefined} />
                <AvatarFallback className="text-[8px]">
                  {getInitials(
                    activity.user.firstName,
                    activity.user.lastName,
                    activity.user.email
                  )}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">
                {getUserName(
                  activity.user.firstName,
                  activity.user.lastName,
                  activity.user.email
                )}
              </span>
            </>
          ) : (
            <span className="font-medium text-muted-foreground">System</span>
          )}
          <span className="text-muted-foreground">{activity.action}</span>
        </div>

        <p className="text-muted-foreground mt-0.5">{activity.description}</p>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(activity.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </TooltipTrigger>
            <TooltipContent>
              {format(new Date(activity.createdAt), "PPpp")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

interface ActivityTimelineProps {
  releaseId: string;
  limit?: number;
}

export function ActivityTimeline({ releaseId, limit = 20 }: ActivityTimelineProps) {
  const { data: activities, isLoading, error } = useActivities(releaseId, limit);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <CardTitle className="text-lg">Activity</CardTitle>
        </div>
        <CardDescription>
          Recent activity for this release
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive text-center py-4">
            Failed to load activity
          </p>
        )}

        {!isLoading && !error && activities?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity recorded yet
          </p>
        )}

        {!isLoading && !error && activities && activities.length > 0 && (
          <div className="space-y-0">
            {activities.map((activity, index) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
