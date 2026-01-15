"use client";

import { useState, useMemo } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { KanbanBoard } from "@/components/board/kanban-board";
import { useReleases } from "@/hooks/use-releases";
import { useSprints } from "@/hooks/use-sprints";
import { useServices } from "@/hooks/use-services";

export default function BoardPage() {
  const [selectedSprintId, setSelectedSprintId] = useState<string>("all");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("all");
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch data
  const { data: sprints = [], isLoading: sprintsLoading } = useSprints();
  const { data: services = [], isLoading: servicesLoading } = useServices();
  const { data: releases = [], isLoading: releasesLoading } = useReleases({
    sprintId: selectedSprintId !== "all" ? selectedSprintId : undefined,
    serviceId: selectedServiceId !== "all" ? selectedServiceId : undefined,
  });

  // Find active or most recent sprint as default
  const activeSprint = useMemo(() => {
    return sprints.find((s) => s.status === "ACTIVE") || sprints[0];
  }, [sprints]);

  // Filter releases
  const filteredReleases = useMemo(() => {
    let result = releases;

    if (showBlockedOnly) {
      result = result.filter((r) => r.isBlocked);
    }

    return result;
  }, [releases, showBlockedOnly]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedServiceId !== "all") count++;
    if (showBlockedOnly) count++;
    return count;
  }, [selectedServiceId, showBlockedOnly]);

  const clearFilters = () => {
    setSelectedServiceId("all");
    setShowBlockedOnly(false);
  };

  const isLoading = sprintsLoading || servicesLoading || releasesLoading;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sprint Board</h1>
          <p className="text-muted-foreground">
            Drag releases between columns to update their status
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sprint Selector */}
          <Select
            value={selectedSprintId}
            onValueChange={setSelectedSprintId}
            disabled={sprintsLoading}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select sprint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sprints</SelectItem>
              {sprints.map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  <div className="flex items-center gap-2">
                    <span>{sprint.name}</span>
                    {sprint.status === "ACTIVE" && (
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter Toggle */}
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-4 p-4 rounded-lg border bg-muted/30">
          <div className="flex flex-wrap items-center gap-6">
            {/* Service Filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="service-filter" className="text-sm font-medium">
                Service:
              </Label>
              <Select
                value={selectedServiceId}
                onValueChange={setSelectedServiceId}
                disabled={servicesLoading}
              >
                <SelectTrigger id="service-filter" className="w-[180px]">
                  <SelectValue placeholder="All services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: service.color }}
                        />
                        {service.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Blocked Only Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="blocked-filter"
                checked={showBlockedOnly}
                onCheckedChange={setShowBlockedOnly}
              />
              <Label htmlFor="blocked-filter" className="text-sm font-medium">
                Blocked only
              </Label>
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Board Stats */}
      {!isLoading && (
        <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {filteredReleases.length} release
            {filteredReleases.length !== 1 ? "s" : ""}
          </span>
          {selectedSprintId !== "all" && (
            <span>
              •{" "}
              {sprints.find((s) => s.id === selectedSprintId)?.name ||
                "Unknown Sprint"}
            </span>
          )}
          {showBlockedOnly && (
            <Badge variant="destructive" className="text-xs">
              Showing blocked only
            </Badge>
          )}
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 min-h-0">
        <KanbanBoard releases={filteredReleases} isLoading={isLoading} />
      </div>
    </div>
  );
}
