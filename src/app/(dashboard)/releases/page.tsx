"use client";

import { useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
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
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  ExternalLink,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useReleases,
  useCreateRelease,
  useUpdateRelease,
  useDeleteRelease,
  Release,
} from "@/hooks/use-releases";
import { useServices } from "@/hooks/use-services";
import { useSprints } from "@/hooks/use-sprints";
import { ReleaseStatus } from "@/lib/validations/release";

export const dynamic = "force-dynamic";

interface ReleaseFormData {
  title: string;
  description: string;
  serviceId: string;
  sprintId: string;
  version: string;
  targetDate: Date | undefined;
}

const defaultFormData: ReleaseFormData = {
  title: "",
  description: "",
  serviceId: "",
  sprintId: "",
  version: "",
  targetDate: undefined,
};

const statusColors: Record<ReleaseStatus, string> = {
  PLANNING: "bg-slate-100 text-slate-700",
  IN_DEVELOPMENT: "bg-yellow-100 text-yellow-700",
  IN_REVIEW: "bg-orange-100 text-orange-700",
  READY_STAGING: "bg-purple-100 text-purple-700",
  IN_STAGING: "bg-indigo-100 text-indigo-700",
  STAGING_VERIFIED: "bg-cyan-100 text-cyan-700",
  READY_PRODUCTION: "bg-emerald-100 text-emerald-700",
  DEPLOYED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  ROLLED_BACK: "bg-rose-100 text-rose-700",
};

const statusLabels: Record<ReleaseStatus, string> = {
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

export default function ReleasesPage() {
  const { data: releases, isLoading: releasesLoading } = useReleases();
  const { data: services, isLoading: servicesLoading } = useServices();
  const { data: sprints, isLoading: sprintsLoading } = useSprints();
  const createRelease = useCreateRelease();
  const updateRelease = useUpdateRelease();
  const deleteRelease = useDeleteRelease();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);
  const [formData, setFormData] = useState<ReleaseFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isLoading = releasesLoading || servicesLoading || sprintsLoading;

  const handleOpenCreate = () => {
    setEditingRelease(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (release: Release) => {
    setEditingRelease(release);
    setFormData({
      title: release.title,
      description: release.description || "",
      serviceId: release.serviceId,
      sprintId: release.sprintId || "none",
      version: release.version || "",
      targetDate: release.targetDate ? new Date(release.targetDate) : undefined,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.serviceId) {
      toast.error("Please select a service");
      return;
    }

    try {
      const data = {
        title: formData.title,
        description: formData.description || undefined,
        serviceId: formData.serviceId,
        sprintId: formData.sprintId && formData.sprintId !== "none" ? formData.sprintId : undefined,
        version: formData.version || undefined,
        targetDate: formData.targetDate?.toISOString(),
      };

      if (editingRelease) {
        await updateRelease.mutateAsync({
          id: editingRelease.id,
          data,
        });
        toast.success("Release updated successfully");
      } else {
        await createRelease.mutateAsync(data);
        toast.success("Release created successfully");
      }
      setIsDialogOpen(false);
      setFormData(defaultFormData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRelease.mutateAsync(id);
      toast.success("Release deleted successfully");
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete release");
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null, email: string) => {
    if (firstName || lastName) {
      const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`;
      return initials.toUpperCase() || email.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Releases</h1>
          <p className="text-muted-foreground">
            Manage all releases across your services
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={handleOpenCreate}
              disabled={servicesLoading || !services || services.length === 0}
              title={!services || services.length === 0 ? "Create a service first" : undefined}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Release
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingRelease ? "Edit Release" : "New Release"}
                </DialogTitle>
                <DialogDescription>
                  {editingRelease
                    ? "Update the release details."
                    : "Create a new release to track."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., User Authentication v2"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Service *</Label>
                    <Select
                      value={formData.serviceId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, serviceId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services?.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: service.color }}
                              />
                              {service.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) =>
                        setFormData({ ...formData, version: e.target.value })
                      }
                      placeholder="e.g., 2.1.0"
                    />
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
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe what this release includes..."
                    rows={3}
                  />
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
                  disabled={createRelease.isPending || updateRelease.isPending}
                >
                  {createRelease.isPending || updateRelease.isPending
                    ? "Saving..."
                    : editingRelease
                    ? "Save Changes"
                    : "Create Release"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Release</TableHead>
                <TableHead>Service</TableHead>
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
                    <Skeleton className="h-5 w-24" />
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
      ) : releases && releases.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Release</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Sprint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releases.map((release) => (
                <TableRow key={release.id}>
                  <TableCell>
                    <div>
                      <Link
                        href={`/releases/${release.id}`}
                        className="font-medium hover:underline"
                      >
                        {release.title}
                      </Link>
                      {release.version && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          v{release.version}
                        </span>
                      )}
                      {release.targetDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(release.targetDate), "MMM d, yyyy")}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: release.service.color }}
                      />
                      <span className="text-sm">{release.service.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {release.sprint ? (
                      <span className="text-sm">{release.sprint.name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[release.status]}
                    >
                      {statusLabels[release.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {release.owner ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={release.owner.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(release.owner.firstName, release.owner.lastName, release.owner.email)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Dialog
                      open={deleteConfirmId === release.id}
                      onOpenChange={(open) =>
                        setDeleteConfirmId(open ? release.id : null)
                      }
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/releases/${release.id}`}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(release)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteConfirmId(release.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Release</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete &quot;{release.title}&quot;?
                            This will also delete all items, dependencies, and comments
                            associated with this release. This action cannot be undone.
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
                            onClick={() => handleDelete(release.id)}
                            disabled={deleteRelease.isPending}
                          >
                            {deleteRelease.isPending ? "Deleting..." : "Delete"}
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
      ) : !services || services.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No releases yet"
          description="Create a service first before adding releases. Services help you organize and track your deployments."
        />
      ) : (
        <EmptyState
          icon={Rocket}
          title="No releases yet"
          description="Create your first release to start tracking deployments. Releases help you manage and coordinate your software delivery."
          action={{
            label: "New Release",
            onClick: handleOpenCreate,
          }}
        />
      )}
    </div>
  );
}
