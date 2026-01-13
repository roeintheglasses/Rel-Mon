import { AlertCircle } from "lucide-react";
export const dynamic = "force-dynamic";

export default function BlockedPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Blocked Releases</h1>
        <p className="text-muted-foreground">
          Releases that are blocked by dependencies
        </p>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          No blocked releases. Great work!
        </p>
      </div>
    </div>
  );
}
