import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default function DeploymentGroupsPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deployment Groups</h1>
          <p className="text-muted-foreground">
            Coordinate releases that need to deploy together
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          No deployment groups yet. Create a group to coordinate related releases.
        </p>
      </div>
    </div>
  );
}
