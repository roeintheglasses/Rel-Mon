"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  Package,
  Rocket,
  CheckCircle,
  XCircle,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useDeploymentGroups,
  useCreateDeploymentGroup,
  useUpdateDeploymentGroup,
  useDeleteDeploymentGroup,
  useAssignReleases,
  useRemoveReleases,
  DeploymentGroup,
} from "@/hooks/use-deployment-groups";
import { useReleases } from "@/hooks/use-releases";
import { useSprints } from "@/hooks/use-sprints";
import { DeployOrder, DeploymentGroupStatus } from "@/lib/validations/deployment-group";

export const dynamic = "force-dynamic";

interface DeploymentGroupFormData {
  name: string;
  description: string;
  sprintId: string;
  deployOrder: DeployOrder;
  targetDate: Date | undefined;
  notifyOnReady: boolean;
}

const defaultFormData: DeploymentGroupFormData = {
  name: "",
  description: "",
  sprintId: "",
  deployOrder: "SEQUENTIAL",
  targetDate: undefined,
  notifyOnReady: true,
};

const statusColors: Record<DeploymentGroupStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  READY: "bg-emerald-100 text-emerald-700",
  DEPLOYING: "bg-blue-100 text-blue-700",
  DEPLOYED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const statusLabels: Record<DeploymentGroupStatus, string> = {
  PENDING: "Pending",
  READY: "Ready",
  DEPLOYING: "Deploying",
  DEPLOYED: "Deployed",
  CANCELLED: "Cancelled",
};

const deployOrderLabels: Record<DeployOrder, string> = {
  SEQUENTIAL: "Sequential",
  SIMULTANEOUS: "Simultaneous",
};

export default function DeploymentGroupsPage() {
  const { data: groups, isLoading: groupsLoading } = useDeploymentGroups();
  const { data: releases, isLoading: releasesLoading } = useReleases();
  const { data: sprints, isLoading: sprintsLoading } = useSprints();
  const createGroup = useCreateDeploymentGroup();
  const updateGroup = useUpdateDeploymentGroup();
  const deleteGroup = useDeleteDeploymentGroup();
  const assignReleases = useAssignReleases();
  const removeReleases = useRemoveReleases();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DeploymentGroup | null>(null);
  const [formData, setFormData] = useState<DeploymentGroupFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [assignDialogGroupId, setAssignDialogGroupId] = useState<string | null>(null);
  const [selectedReleaseIds, setSelectedReleaseIds] = useState<string[]>([]);

  const isLoading = groupsLoading || releasesLoading || sprintsLoading;

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (group: DeploymentGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      sprintId: group.sprintId || "none",
      deployOrder: group.deployOrder,
      targetDate: group.targetDate ? new Date(group.targetDate) : undefined,
      notifyOnReady: group.notifyOnReady,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        name: formData.name,
        description: formData.description || undefined,
        sprintId: formData.sprintId && formData.sprintId !== "none" ? formData.sprintId : undefined,
        deployOrder: formData.deployOrder,
        targetDate: formData.targetDate?.toISOString(),
        notifyOnReady: formData.notifyOnReady,
      };

      if (editingGroup) {
        await updateGroup.mutateAsync({
          id: editingGroup.id,
          data,
        });
        toast.success("Deployment group updated successfully");
      } else {
        await createGroup.mutateAsync(data);
        toast.success("Deployment group created successfully");
      }
      setIsDialogOpen(false);
      setFormData(defaultFormData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGroup.mutateAsync(id);
      toast.success("Deployment group deleted successfully");
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete deployment group");
    }
  };

  const handleStatusChange = async (group: DeploymentGroup, newStatus: DeploymentGroupStatus) => {
    try {
      await updateGroup.mutateAsync({
        id: group.id,
        data: { status: newStatus },
      });
      toast.success(`Status updated to ${statusLabels[newStatus]}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  const handleOpenAssignDialog = (group: DeploymentGroup) => {
    setAssignDialogGroupId(group.id);
    // Pre-select already assigned releases
    const assignedIds = group.releases?.map((r) => r.id) || [];
    setSelectedReleaseIds(assignedIds);
  };

  const handleAssignReleases = async () => {
    if (!assignDialogGroupId) return;

    const currentGroup = groups?.find((g) => g.id === assignDialogGroupId);
    const currentReleaseIds = currentGroup?.releases?.map((r) => r.id) || [];

    // Find releases to add and remove
    const toAdd = selectedReleaseIds.filter((id) => !currentReleaseIds.includes(id));
    const toRemove = currentReleaseIds.filter((id) => !selectedReleaseIds.includes(id));

    try {
      if (toRemove.length > 0) {
        await removeReleases.mutateAsync({
          groupId: assignDialogGroupId,
          releaseIds: toRemove,
        });
      }
      if (toAdd.length > 0) {
        await assignReleases.mutateAsync({
          groupId: assignDialogGroupId,
          releaseIds: toAdd,
        });
      }
      toast.success("Releases updated successfully");
      setAssignDialogGroupId(null);
      setSelectedReleaseIds([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update releases");
    }
  };

  const toggleReleaseSelection = (releaseId: string) => {
    setSelectedReleaseIds((prev) =>
      prev.includes(releaseId)
        ? prev.filter((id) => id !== releaseId)
        : [...prev, releaseId]
    );
  };

  const getInitials = (firstName: string | null, lastName: string | null, email: string) => {
    if (firstName || lastName) {
      const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`;
      return initials.toUpperCase() || email.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  // Get available releases (not assigned to another group or assigned to current group)
  const getAvailableReleases = () => {
    if (!releases) return [];
    return releases.filter((release) => {
      // Include if not assigned to any group
      if (!release.deploymentGroupId) return true;
      // Include if assigned to the current group we're editing
      if (release.deploymentGroupId === assignDialogGroupId) return true;
      return false;
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deployment Groups</h1>
          <p className="text-muted-foreground">
            Coordinate releases that need to deploy together
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingGroup ? "Edit Deployment Group" : "Create Deployment Group"}
                </DialogTitle>
                <DialogDescription>
                  {editingGroup
                    ? "Update the deployment group details."
                    : "Create a new group to coordinate related releases."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Q1 Platform Release"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Sprint</Label>
                    <Select
                      value={formData.sprintId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, sprintId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sprint (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No sprint</SelectItem>
                        {sprints
                          ?.filter((s) => s.status !== "COMPLETED" && s.status !== "CANCELLED")
                          .map((sprint) => (
                            <SelectItem key={sprint.id} value={sprint.id}>
                              {sprint.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Deploy Order</Label>
                    <Select
                      value={formData.deployOrder}
                      onValueChange={(value: DeployOrder) =>
                        setFormData({ ...formData, deployOrder: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEQUENTIAL">Sequential</SelectItem>
                        <SelectItem value="SIMULTANEOUS">Simultaneous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Target Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !formData.targetDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.targetDate
                          ? format(formData.targetDate, "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.targetDate}
                        onSelect={(date) =>
                          setFormData({ ...formData, targetDate: date })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe what this deployment group includes..."
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notifyOnReady"
                    checked={formData.notifyOnReady}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, notifyOnReady: checked as boolean })
                    }
                  />
                  <Label htmlFor="notifyOnReady" className="text-sm font-normal">
                    Notify team when all releases are ready to deploy
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createGroup.isPending || updateGroup.isPending}
                >
                  {createGroup.isPending || updateGroup.isPending
                    ? "Saving..."
                    : editingGroup
                    ? "Save Changes"
                    : "Create Group"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assign Releases Dialog */}
      <Dialog
        open={!!assignDialogGroupId}
        onOpenChange={(open) => {
          if (!open) {
            setAssignDialogGroupId(null);
            setSelectedReleaseIds([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Releases</DialogTitle>
            <DialogDescription>
              Select releases to include in this deployment group.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-2">
              {getAvailableReleases().length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No available releases to assign.
                </p>
              ) : (
                getAvailableReleases().map((release) => (
                  <div
                    key={release.id}
                    className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`release-${release.id}`}
                      checked={selectedReleaseIds.includes(release.id)}
                      onCheckedChange={() => toggleReleaseSelection(release.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: release.service.color }}
                        />
                        <span className="font-medium truncate">{release.title}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {release.service.name}
                      </div>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0">
                      {release.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignDialogGroupId(null);
                setSelectedReleaseIds([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignReleases}
              disabled={assignReleases.isPending || removeReleases.isPending}
            >
              {assignReleases.isPending || removeReleases.isPending
                ? "Saving..."
                : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Releases</TableHead>
                <TableHead>Sprint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : groups && groups.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Releases</TableHead>
                <TableHead>Sprint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{group.name}</span>
                      </div>
                      {group.targetDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(group.targetDate), "MMM d, yyyy")}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {deployOrderLabels[group.deployOrder]}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Rocket className="h-4 w-4 text-muted-foreground" />
                      <span>{group._count?.releases || 0} releases</span>
                    </div>
                    {group.releases && group.releases.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {group.releases.slice(0, 3).map((release) => (
                          <div
                            key={release.id}
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: release.service.color }}
                            title={release.title}
                          />
                        ))}
                        {group.releases.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{group.releases.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {group.sprint ? (
                      <span className="text-sm">{group.sprint.name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[group.status]}
                    >
                      {statusLabels[group.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {group.owner ? (
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={group.owner.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(group.owner.firstName, group.owner.lastName, group.owner.email)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Dialog
                      open={deleteConfirmId === group.id}
                      onOpenChange={(open) =>
                        setDeleteConfirmId(open ? group.id : null)
                      }
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(group)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenAssignDialog(group)}>
                            <Rocket className="mr-2 h-4 w-4" />
                            Manage Releases
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {group.status === "PENDING" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(group, "READY")}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Ready
                            </DropdownMenuItem>
                          )}
                          {group.status === "READY" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(group, "DEPLOYING")}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Start Deployment
                            </DropdownMenuItem>
                          )}
                          {group.status === "DEPLOYING" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(group, "DEPLOYED")}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Deployed
                            </DropdownMenuItem>
                          )}
                          {(group.status === "PENDING" || group.status === "READY") && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(group, "CANCELLED")}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteConfirmId(group.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Deployment Group</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete &quot;{group.name}&quot;?
                            Releases in this group will be unassigned but not deleted.
                            This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setDeleteConfirmId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleDelete(group.id)}
                            disabled={deleteGroup.isPending}
                          >
                            {deleteGroup.isPending ? "Deleting..." : "Delete"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No deployment groups yet</h3>
          <p className="mt-2 text-muted-foreground">
            Create a group to coordinate related releases that need to deploy together.
          </p>
          <Button className="mt-4" onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        </div>
      )}
    </div>
  );
}
