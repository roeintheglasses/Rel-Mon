export const dynamic = "force-dynamic";

export default function ReadyToDeployPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ready to Deploy</h1>
        <p className="text-muted-foreground">
          Releases that are ready for staging or production deployment
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">Ready for Staging</h2>
          </div>
          <div className="p-4 text-center text-muted-foreground">
            No releases ready for staging
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">Ready for Production</h2>
          </div>
          <div className="p-4 text-center text-muted-foreground">
            No releases ready for production
          </div>
        </div>
      </div>
    </div>
  );
}
