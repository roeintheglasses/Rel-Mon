"use client";

import { forwardRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  AlertTriangle,
  Link as LinkIcon,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Release } from "@/hooks/use-releases";

interface ReleaseCardProps {
  release: Release;
  isDragging?: boolean;
  isOverlay?: boolean;
}

const ReleaseCardContent = forwardRef<
  HTMLDivElement,
  ReleaseCardProps & {
    style?: React.CSSProperties;
    listeners?: SyntheticListenerMap;
    attributes?: DraggableAttributes;
  }
>(({ release, isDragging, isOverlay, style, listeners, attributes }, ref) => {
  const getInitials = (
    firstName: string | null,
    lastName: string | null,
    email: string
  ) => {
    if (firstName || lastName) {
      const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`;
      return initials.toUpperCase() || email.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getOwnerName = (owner: Release["owner"]) => {
    if (owner.firstName || owner.lastName) {
      return `${owner.firstName || ""} ${owner.lastName || ""}`.trim();
    }
    return owner.email;
  };

  const dependencyCount =
    (release._count?.dependsOn || 0) + (release._count?.dependents || 0);

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "group relative rounded-lg border bg-card p-3 shadow-sm transition-all",
        isDragging && "opacity-50",
        isOverlay && "rotate-3 shadow-lg",
        !isDragging && !isOverlay && "hover:shadow-md hover:border-primary/50"
      )}
    >
      {/* Drag Handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="pl-4">
        {/* Header: Service color + Title */}
        <div className="flex items-start gap-2 mb-2">
          <div
            className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: release.service.color }}
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm leading-tight line-clamp-2">
              {release.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {release.service.name}
              {release.version && (
                <span className="ml-1">v{release.version}</span>
              )}
            </p>
          </div>
        </div>

        {/* Indicators row */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {/* Blocked indicator */}
            {release.isBlocked && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="destructive"
                    className="h-5 px-1.5 text-xs gap-1"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Blocked
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {release.blockedReason || "This release is blocked"}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Dependency count */}
            {dependencyCount > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <LinkIcon className="h-3 w-3" />
                    {dependencyCount}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {release._count?.dependsOn || 0} dependencies,{" "}
                  {release._count?.dependents || 0} dependents
                </TooltipContent>
              </Tooltip>
            )}

            {/* Target date */}
            {release.targetDate && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(release.targetDate), "MMM d")}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Target: {format(new Date(release.targetDate), "PPP")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Owner avatar */}
          <Tooltip>
            <TooltipTrigger>
              <Avatar className="h-6 w-6">
                <AvatarImage src={release.owner.avatarUrl || undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(
                    release.owner.firstName,
                    release.owner.lastName,
                    release.owner.email
                  )}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{getOwnerName(release.owner)}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});

ReleaseCardContent.displayName = "ReleaseCardContent";

export function ReleaseCard({ release }: ReleaseCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: release.id,
    data: {
      type: "release",
      release,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <ReleaseCardContent
      ref={setNodeRef}
      release={release}
      isDragging={isDragging}
      style={style}
      listeners={listeners}
      attributes={attributes}
    />
  );
}

export function ReleaseCardOverlay({ release }: { release: Release }) {
  return <ReleaseCardContent release={release} isOverlay />;
}
