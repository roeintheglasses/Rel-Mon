import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ReleasesPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Releases</h1>
          <p className="text-muted-foreground">
            Manage all releases across your services
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Release
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          No releases yet. Create your first release to get started.
        </p>
      </div>
    </div>
  );
}
