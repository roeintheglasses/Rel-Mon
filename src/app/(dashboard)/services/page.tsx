"use client";

import { useState } from "react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, Pencil, Trash2, ExternalLink, Server } from "lucide-react";
import { toast } from "sonner";
import {
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  Service,
} from "@/hooks/use-services";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const SERVICE_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
];

interface ServiceFormData {
  name: string;
  description: string;
  repoOwner: string;
  repoName: string;
  repoUrl: string;
  jiraProjectKey: string;
  color: string;
}

const defaultFormData: ServiceFormData = {
  name: "",
  description: "",
  repoOwner: "",
  repoName: "",
  repoUrl: "",
  jiraProjectKey: "",
  color: SERVICE_COLORS[0],
};

export default function ServicesPage() {
  const { data: services, isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingService(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      repoOwner: service.repoOwner || "",
      repoName: service.repoName || "",
      repoUrl: service.repoUrl || "",
      jiraProjectKey: service.jiraProjectKey || "",
      color: service.color,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingService) {
        await updateService.mutateAsync({
          id: editingService.id,
          data: formData,
        });
        toast.success("Service updated successfully");
      } else {
        await createService.mutateAsync(formData);
        toast.success("Service created successfully");
      }
      setIsDialogOpen(false);
      setFormData(defaultFormData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteService.mutateAsync(id);
      toast.success("Service deleted successfully");
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete service");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-muted-foreground">
            Manage your services and repositories
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingService ? "Edit Service" : "Add Service"}
                </DialogTitle>
                <DialogDescription>
                  {editingService
                    ? "Update the service details."
                    : "Add a new service to track releases for."}
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
                    placeholder="e.g., Auth Service"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Brief description of the service"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="repoOwner">GitHub Org/Owner</Label>
                    <Input
                      id="repoOwner"
                      value={formData.repoOwner}
                      onChange={(e) =>
                        setFormData({ ...formData, repoOwner: e.target.value })
                      }
                      placeholder="e.g., myorg"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repoName">GitHub Repo</Label>
                    <Input
                      id="repoName"
                      value={formData.repoName}
                      onChange={(e) =>
                        setFormData({ ...formData, repoName: e.target.value })
                      }
                      placeholder="e.g., auth-service"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="jiraProjectKey">Jira Project Key</Label>
                  <Input
                    id="jiraProjectKey"
                    value={formData.jiraProjectKey}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jiraProjectKey: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g., AUTH"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`h-8 w-8 rounded-full border-2 ${
                          formData.color === color
                            ? "border-foreground"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
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
                  disabled={createService.isPending || updateService.isPending}
                >
                  {createService.isPending || updateService.isPending
                    ? "Saving..."
                    : editingService
                    ? "Save Changes"
                    : "Add Service"}
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
                <TableHead>Service</TableHead>
                <TableHead>Repository</TableHead>
                <TableHead>Jira</TableHead>
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
                    <Skeleton className="h-5 w-16" />
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
      ) : services && services.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Repository</TableHead>
                <TableHead>Jira</TableHead>
                <TableHead>Releases</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: service.color }}
                      />
                      <div>
                        <div className="font-medium">{service.name}</div>
                        {service.description && (
                          <div className="text-sm text-muted-foreground">
                            {service.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {service.repoOwner && service.repoName ? (
                      <a
                        href={`https://github.com/${service.repoOwner}/${service.repoName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                      >
                        {service.repoOwner}/{service.repoName}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {service.jiraProjectKey ? (
                      <Badge variant="secondary">{service.jiraProjectKey}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{service._count?.releases || 0}</span>
                  </TableCell>
                  <TableCell>
                    <Dialog
                      open={deleteConfirmId === service.id}
                      onOpenChange={(open) =>
                        setDeleteConfirmId(open ? service.id : null)
                      }
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(service)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteConfirmId(service.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Service</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete &quot;{service.name}&quot;?
                            This will also delete all releases associated with this
                            service. This action cannot be undone.
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
                            onClick={() => handleDelete(service.id)}
                            disabled={deleteService.isPending}
                          >
                            {deleteService.isPending ? "Deleting..." : "Delete"}
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
        <EmptyState
          icon={Server}
          title="No services yet"
          description="Services represent your microservices or applications. Add your first service to start tracking releases and deployments."
          action={{
            label: "Add Service",
            onClick: handleOpenCreate,
          }}
        />
      )}
    </div>
  );
}
