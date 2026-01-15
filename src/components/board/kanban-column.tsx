"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Release } from "@/hooks/use-releases";
import { ReleaseCard } from "./release-card";
import { ReleaseStatus } from "@/lib/validations/release";

export interface ColumnConfig {
  id: ReleaseStatus;
  title: string;
  color: string;
}

interface KanbanColumnProps {
  column: ColumnConfig;
  releases: Release[];
}

export function KanbanColumn({ column, releases }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      status: column.id,
    },
  });

  const releaseIds = releases.map((r) => r.id);

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-lg bg-muted/50">
      {/* Column Header */}
      <div className={cn("rounded-t-lg px-4 py-3", column.color)}>
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">{column.title}</h3>
          <Badge variant="secondary" className="text-xs bg-white/80">
            {releases.length}
          </Badge>
        </div>
      </div>

      {/* Column Content */}
      <ScrollArea className="flex-1">
        <div
          ref={setNodeRef}
          className={cn(
            "min-h-[200px] p-2 space-y-2 transition-colors",
            isOver && "bg-primary/5"
          )}
        >
          <SortableContext
            items={releaseIds}
            strategy={verticalListSortingStrategy}
          >
            {releases.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/20 text-xs text-muted-foreground">
                No releases
              </div>
            ) : (
              releases.map((release) => (
                <ReleaseCard key={release.id} release={release} />
              ))
            )}
          </SortableContext>
        </div>
      </ScrollArea>
    </div>
  );
}
