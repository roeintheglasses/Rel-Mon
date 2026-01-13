export const dynamic = "force-dynamic";

export default function MyReleasesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Releases</h1>
        <p className="text-muted-foreground">
          Releases you own or are assigned to
        </p>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          No releases assigned to you yet.
        </p>
      </div>
    </div>
  );
}
