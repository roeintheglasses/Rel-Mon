"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useDashboard } from "@/hooks/use-dashboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowRight,
  LayoutDashboard,
  Package,
  Rocket,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Loader2,
  Plus,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants/release";

function getInitials(firstName: string | null, lastName: string | null, email: string) {
  if (firstName || lastName) {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function getUserName(firstName: string | null, lastName: string | null, email: string) {
  if (firstName || lastName) {
    return `${firstName || ""} ${lastName || ""}`.trim();
  }
  return email;
}

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  href?: string;
  variant?: "default" | "warning" | "success";
}

function StatCard({ title, value, description, icon, href, variant = "default" }: StatCardProps) {
  const cardContent = (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`${variant === "warning" ? "text-yellow-500" : variant === "success" ? "text-green-500" : "text-muted-foreground"}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
      {href && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </>
  );

  const cardClassName = `relative overflow-hidden ${variant === "warning" ? "border-yellow-500/50" : variant === "success" ? "border-green-500/50" : ""}`;

  if (href) {
    return (
      <Link href={href} className="block group hover:opacity-80 transition-opacity">
        <Card className={cardClassName}>
          {cardContent}
        </Card>
      </Link>
    );
  }

  return <Card className={cardClassName}>{cardContent}</Card>;
}

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    );
  }

  const { stats, activeSprint, recentActivities, upcomingDeployments } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of your release management
            {activeSprint && (
              <span className="ml-2">
                • Active Sprint: <strong>{activeSprint.name}</strong>
              </span>
            )}
          </p>
        </div>
        <Button asChild>
          <Link href="/releases/new">
            <Plus className="h-4 w-4 mr-2" />
            New Release
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Releases"
          value={stats.totalReleases}
          description="Currently in pipeline"
          icon={<Package className="h-4 w-4" />}
          href="/board"
        />
        <StatCard
          title="Ready to Deploy"
          value={stats.releasesReadyToDeploy}
          description="Awaiting deployment"
          icon={<Rocket className="h-4 w-4" />}
          href="/ready-to-deploy"
          variant="success"
        />
        <StatCard
          title="Blocked"
          value={stats.blockedReleases}
          description="Need attention"
          icon={<AlertTriangle className="h-4 w-4" />}
          href="/blocked"
          variant={stats.blockedReleases > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Deployed This Month"
          value={stats.deployedThisMonth}
          description="Successful deployments"
          icon={<CheckCircle className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Deployments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Ready for Deployment
                </CardTitle>
                <CardDescription>
                  Releases ready to be deployed
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/ready-to-deploy">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingDeployments.length > 0 ? (
              <div className="space-y-4">
                {upcomingDeployments.map((release) => (
                  <Link
                    key={release.id}
                    href={`/releases/${release.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: release.service.color }}
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{release.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {release.service.name}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className={`${STATUS_COLORS[release.status]} text-white ml-2 flex-shrink-0`}>
                      {STATUS_LABELS[release.status]}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Rocket className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No releases ready for deployment</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest updates across all releases
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={activity.user?.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {activity.user
                          ? getInitials(
                              activity.user.firstName,
                              activity.user.lastName,
                              activity.user.email
                            )
                          : "SY"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {activity.user
                            ? getUserName(
                                activity.user.firstName,
                                activity.user.lastName,
                                activity.user.email
                              )
                            : "System"}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {activity.action}
                        </span>
                      </div>
                      {activity.release && (
                        <Link
                          href={`/releases/${activity.release.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {activity.release.title}
                        </Link>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(activity.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/my-releases" className="block">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                My Releases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.myReleases}</p>
              <p className="text-xs text-muted-foreground">Releases assigned to you</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/board" className="block">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Sprint Board
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.releasesInProgress}</p>
              <p className="text-xs text-muted-foreground">Releases in progress</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/services" className="block">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage your services and repositories
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
