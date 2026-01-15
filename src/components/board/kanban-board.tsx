"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Release, useUpdateRelease } from "@/hooks/use-releases";
import { ReleaseStatus } from "@/lib/validations/release";
import { KanbanColumn, ColumnConfig } from "./kanban-column";
import { ReleaseCardOverlay } from "./release-card";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const COLUMNS: ColumnConfig[] = [
  { id: "PLANNING", title: "Planning", color: "bg-slate-100" },
  { id: "IN_DEVELOPMENT", title: "In Development", color: "bg-yellow-100" },
  { id: "IN_REVIEW", title: "In Review", color: "bg-orange-100" },
  { id: "READY_STAGING", title: "Ready for Staging", color: "bg-purple-100" },
  { id: "IN_STAGING", title: "In Staging", color: "bg-indigo-100" },
  { id: "STAGING_VERIFIED", title: "Staging Verified", color: "bg-cyan-100" },
  { id: "READY_PRODUCTION", title: "Ready for Production", color: "bg-emerald-100" },
  { id: "DEPLOYED", title: "Deployed", color: "bg-green-100" },
];

interface KanbanBoardProps {
  releases: Release[];
  isLoading?: boolean;
}

export function KanbanBoard({ releases, isLoading }: KanbanBoardProps) {
  const [activeRelease, setActiveRelease] = useState<Release | null>(null);
  const updateRelease = useUpdateRelease();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group releases by status
  const releasesByStatus = useMemo(() => {
    const grouped: Record<ReleaseStatus, Release[]> = {
      PLANNING: [],
      IN_DEVELOPMENT: [],
      IN_REVIEW: [],
      READY_STAGING: [],
      IN_STAGING: [],
      STAGING_VERIFIED: [],
      READY_PRODUCTION: [],
      DEPLOYED: [],
      CANCELLED: [],
      ROLLED_BACK: [],
    };

    releases.forEach((release) => {
      if (grouped[release.status]) {
        grouped[release.status].push(release);
      }
    });

    return grouped;
  }, [releases]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const release = releases.find((r) => r.id === active.id);
    if (release) {
      setActiveRelease(release);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveRelease(null);

    if (!over) return;

    const releaseId = active.id as string;
    const release = releases.find((r) => r.id === releaseId);
    if (!release) return;

    // Determine the target status
    let targetStatus: ReleaseStatus | null = null;

    // Check if dropped on a column
    if (over.data.current?.type === "column") {
      targetStatus = over.data.current.status as ReleaseStatus;
    }
    // Check if dropped on another release card
    else if (over.data.current?.type === "release") {
      const overRelease = over.data.current.release as Release;
      targetStatus = overRelease.status;
    }
    // If dropped on a column id directly
    else if (COLUMNS.some((col) => col.id === over.id)) {
      targetStatus = over.id as ReleaseStatus;
    }

    if (!targetStatus || targetStatus === release.status) return;

    // Optimistic update
    queryClient.setQueryData(
      ["releases", undefined],
      (old: Release[] | undefined) => {
        if (!old) return old;
        return old.map((r) =>
          r.id === releaseId ? { ...r, status: targetStatus } : r
        );
      }
    );

    try {
      await updateRelease.mutateAsync({
        id: releaseId,
        data: { status: targetStatus },
      });
      toast.success(`Moved to ${COLUMNS.find((c) => c.id === targetStatus)?.title}`);
    } catch (error) {
      // Revert optimistic update
      queryClient.invalidateQueries({ queryKey: ["releases"] });
      toast.error(
        error instanceof Error ? error.message : "Failed to update status"
      );
    }
  };

  const handleDragCancel = () => {
    setActiveRelease(null);
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => (
          <div
            key={column.id}
            className="flex w-72 flex-shrink-0 flex-col rounded-lg bg-muted/50"
          >
            <div className={`rounded-t-lg px-4 py-3 ${column.color}`}>
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-black/10 rounded animate-pulse" />
                <div className="h-5 w-6 bg-white/80 rounded animate-pulse" />
              </div>
            </div>
            <div className="p-2 space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-lg border bg-card animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              releases={releasesByStatus[column.id] || []}
            />
          ))}
        </div>

        <DragOverlay>
          {activeRelease ? (
            <ReleaseCardOverlay release={activeRelease} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
}
