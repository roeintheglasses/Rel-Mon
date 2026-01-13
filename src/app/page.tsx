import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Rocket, ArrowRight, CheckCircle } from "lucide-react";

export default async function HomePage() {
  const { userId, orgId } = await auth();

  // If user is signed in with an org, redirect to board
  if (userId && orgId) {
    redirect("/board");
  }

  // If user is signed in without org, redirect to org selection
  if (userId && !orgId) {
    redirect("/select-org");
  }

  // Landing page for non-authenticated users
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Release Coordinator</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Coordinate Your
            <span className="text-primary"> Releases</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Track releases, manage dependencies, and coordinate deployments
            across your engineering team. Know what&apos;s ready to ship at a
            glance.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/sign-up">
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/30 py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Everything you need to coordinate releases
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-6">
                <CheckCircle className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-xl font-semibold">Sprint Board</h3>
                <p className="text-muted-foreground">
                  Visualize release status across your sprint with a Kanban
                  board. Drag and drop to update status.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <CheckCircle className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-xl font-semibold">
                  Dependency Tracking
                </h3>
                <p className="text-muted-foreground">
                  Track blocking dependencies between releases. Know what&apos;s
                  stuck and why at a glance.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <CheckCircle className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-xl font-semibold">Integrations</h3>
                <p className="text-muted-foreground">
                  Connect with Jira, GitHub, and Slack. Link tickets and PRs to
                  releases, get notifications.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Release Coordinator</p>
        </div>
      </footer>
    </div>
  );
}
