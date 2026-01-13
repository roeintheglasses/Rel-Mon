import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const columns = [
  { id: "PLANNING", title: "Planning", color: "bg-gray-100" },
  { id: "IN_DEVELOPMENT", title: "In Development", color: "bg-blue-100" },
  { id: "IN_REVIEW", title: "In Review", color: "bg-yellow-100" },
  { id: "READY_STAGING", title: "Ready for Staging", color: "bg-purple-100" },
  { id: "IN_STAGING", title: "In Staging", color: "bg-orange-100" },
  { id: "READY_PRODUCTION", title: "Ready for Production", color: "bg-green-100" },
  { id: "DEPLOYED", title: "Deployed", color: "bg-emerald-100" },
];

export default function BoardPage() {
  return (
    <div className="h-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sprint Board</h1>
          <p className="text-muted-foreground">
            Drag releases between columns to update their status
          </p>
        </div>
      </div>

      <div className="flex h-[calc(100%-80px)] gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div
            key={column.id}
            className="flex w-72 flex-shrink-0 flex-col rounded-lg bg-muted/50"
          >
            <div className={`rounded-t-lg px-4 py-3 ${column.color}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{column.title}</h3>
                <Badge variant="secondary" className="text-xs">
                  0
                </Badge>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {/* Release cards will go here */}
              <div className="flex h-32 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/20 text-sm text-muted-foreground">
                No releases
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
