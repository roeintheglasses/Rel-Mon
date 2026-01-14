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
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  Play,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useSprints,
  useCreateSprint,
  useUpdateSprint,
  useDeleteSprint,
  Sprint,
} from "@/hooks/use-sprints";

export const dynamic = "force-dynamic";

interface SprintFormData {
  name: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  goal: string;
}

const defaultFormData: SprintFormData = {
  name: "",
  startDate: undefined,
  endDate: undefined,
  goal: "",
};

const statusColors: Record<Sprint["status"], string> = {
  PLANNING: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const statusLabels: Record<Sprint["status"], string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function SprintsPage() {
  const { data: sprints, isLoading } = useSprints();
  const createSprint = useCreateSprint();
  const updateSprint = useUpdateSprint();
  const deleteSprint = useDeleteSprint();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [formData, setFormData] = useState<SprintFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingSprint(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setFormData({
      name: sprint.name,
      startDate: new Date(sprint.startDate),
      endDate: new Date(sprint.endDate),
      goal: sprint.goal || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.startDate || !formData.endDate) {
      toast.error("Start date and end date are required");
      return;
    }

    if (formData.endDate <= formData.startDate) {
      toast.error("End date must be after start date");
      return;
    }

    try {
      const data = {
        name: formData.name,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        goal: formData.goal || undefined,
      };

      if (editingSprint) {
        await updateSprint.mutateAsync({
          id: editingSprint.id,
          data,
        });
        toast.success("Sprint updated successfully");
      } else {
        await createSprint.mutateAsync(data);
        toast.success("Sprint created successfully");
      }
      setIsDialogOpen(false);
      setFormData(defaultFormData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSprint.mutateAsync(id);
      toast.success("Sprint deleted successfully");
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete sprint");
    }
  };

  const handleStatusChange = async (sprint: Sprint, newStatus: Sprint["status"]) => {
    try {
      await updateSprint.mutateAsync({
        id: sprint.id,
        data: { status: newStatus },
      });
      toast.success(`Sprint marked as ${statusLabels[newStatus].toLowerCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sprints</h1>
          <p className="text-muted-foreground">
            Manage your sprint cycles and timelines
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Sprint
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingSprint ? "Edit Sprint" : "Add Sprint"}
                </DialogTitle>
                <DialogDescription>
                  {editingSprint
                    ? "Update the sprint details."
                    : "Create a new sprint cycle."}
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
                    placeholder="e.g., Sprint 2024-Q1-1"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Start Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !formData.startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.startDate
                            ? format(formData.startDate, "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.startDate}
                          onSelect={(date) =>
                            setFormData({ ...formData, startDate: date })
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-2">
                    <Label>End Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !formData.endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.endDate
                            ? format(formData.endDate, "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.endDate}
                          onSelect={(date) =>
                            setFormData({ ...formData, endDate: date })
                          }
                          disabled={(date) =>
                            formData.startDate
                              ? date <= formData.startDate
                              : false
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="goal">Sprint Goal</Label>
                  <Textarea
                    id="goal"
                    value={formData.goal}
                    onChange={(e) =>
                      setFormData({ ...formData, goal: e.target.value })
                    }
                    placeholder="What's the main objective for this sprint?"
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
                  disabled={createSprint.isPending || updateSprint.isPending}
                >
                  {createSprint.isPending || updateSprint.isPending
                    ? "Saving..."
                    : editingSprint
                    ? "Save Changes"
                    : "Add Sprint"}
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
                <TableHead>Sprint</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Releases</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : sprints && sprints.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sprint</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Releases</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sprints.map((sprint) => (
                <TableRow key={sprint.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{sprint.name}</div>
                      {sprint.goal && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {sprint.goal}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      {format(new Date(sprint.startDate), "MMM d")} -{" "}
                      {format(new Date(sprint.endDate), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[sprint.status]}
                    >
                      {statusLabels[sprint.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{sprint._count?.releases || 0}</span>
                  </TableCell>
                  <TableCell>
                    <Dialog
                      open={deleteConfirmId === sprint.id}
                      onOpenChange={(open) =>
                        setDeleteConfirmId(open ? sprint.id : null)
                      }
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(sprint)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {sprint.status === "PLANNING" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(sprint, "ACTIVE")}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Start Sprint
                            </DropdownMenuItem>
                          )}
                          {sprint.status === "ACTIVE" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(sprint, "COMPLETED")}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Complete Sprint
                            </DropdownMenuItem>
                          )}
                          {(sprint.status === "PLANNING" || sprint.status === "ACTIVE") && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(sprint, "CANCELLED")}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel Sprint
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteConfirmId(sprint.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Sprint</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete &quot;{sprint.name}&quot;?
                            {sprint._count && sprint._count.releases > 0
                              ? " This sprint has releases and cannot be deleted. Remove all releases first."
                              : " This action cannot be undone."}
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
                            onClick={() => handleDelete(sprint.id)}
                            disabled={
                              deleteSprint.isPending ||
                              (sprint._count && sprint._count.releases > 0)
                            }
                          >
                            {deleteSprint.isPending ? "Deleting..." : "Delete"}
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
          <p className="text-muted-foreground">
            No sprints yet. Create your first sprint to start organizing releases.
          </p>
        </div>
      )}
    </div>
  );
}
