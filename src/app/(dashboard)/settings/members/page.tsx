"use client";

import { useState } from "react";
import Link from "next/link";
import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import {
  useInvitations,
  useCreateInvitation,
  useCancelInvitation,
} from "@/hooks/use-invitations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  Mail,
  UserPlus,
  Copy,
  Loader2,
  X,
  Clock,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const ROLE_LABELS = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

const ROLE_BADGE_VARIANTS: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  OWNER: "default",
  ADMIN: "secondary",
  MEMBER: "outline",
  VIEWER: "outline",
};

export default function TeamMembersPage() {
  const { organization, membership, memberships } = useOrganization({
    memberships: {
      infinite: true,
    },
  });
  const { data: invitations, isLoading: isLoadingInvitations } =
    useInvitations();
  const createInvitation = useCreateInvitation();
  const cancelInvitation = useCancelInvitation();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">(
    "MEMBER"
  );
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const isOwnerOrAdmin =
    membership?.role === "org:admin" || membership?.role === "org:owner";

  const handleInvite = async () => {
    try {
      const result = await createInvitation.mutateAsync({
        email: inviteEmail,
        role: inviteRole,
      });

      // Copy invite URL to clipboard
      if (result.inviteUrl) {
        await navigator.clipboard.writeText(result.inviteUrl);
        toast.success(
          "Invitation created! Invite link copied to clipboard.",
          {
            description: `Send the link to ${inviteEmail} to complete the invitation.`,
          }
        );
      } else {
        toast.success("Invitation created!");
      }

      setInviteEmail("");
      setInviteRole("MEMBER");
      setIsInviteOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create invitation"
      );
    }
  };

  const handleCancelInvitation = async (id: string) => {
    try {
      await cancelInvitation.mutateAsync(id);
      toast.success("Invitation cancelled");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel invitation"
      );
    }
  };

  const handleCopyLink = async (token: string) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const inviteUrl = `${appUrl}/invite/${token}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast.success("Invite link copied to clipboard");
  };

  const clerkMembers = memberships?.data || [];

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Team Members
            </h1>
            <p className="text-muted-foreground">
              Manage your team members and invitations
            </p>
          </div>
          {isOwnerOrAdmin && (
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join {organization?.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) =>
                        setInviteRole(v as "ADMIN" | "MEMBER" | "VIEWER")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">
                          Admin - Can manage team settings and members
                        </SelectItem>
                        <SelectItem value="MEMBER">
                          Member - Can create and manage releases
                        </SelectItem>
                        <SelectItem value="VIEWER">
                          Viewer - Read-only access
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsInviteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleInvite}
                    disabled={!inviteEmail || createInvitation.isPending}
                  >
                    {createInvitation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Current Members */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Members</CardTitle>
          <CardDescription>
            People who have access to {organization?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clerkMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {member.publicUserData?.imageUrl ? (
                        <img
                          src={member.publicUserData.imageUrl}
                          alt=""
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {member.publicUserData?.firstName?.[0] ||
                              member.publicUserData?.identifier?.[0] ||
                              "?"}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium">
                          {member.publicUserData?.firstName}{" "}
                          {member.publicUserData?.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.publicUserData?.identifier}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member.role === "org:admin" ? "secondary" : "outline"
                      }
                    >
                      {member.role === "org:admin" ? "Admin" : "Member"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.createdAt
                      ? formatDistanceToNow(new Date(member.createdAt), {
                          addSuffix: true,
                        })
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>
            Invitations that haven&apos;t been accepted yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingInvitations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invitations && invitations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {invitation.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ROLE_BADGE_VARIANTS[invitation.role]}>
                        {ROLE_LABELS[invitation.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(invitation.expiresAt), {
                          addSuffix: true,
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleCopyLink(invitation.token || invitation.id)
                          }
                          title="Copy invite link"
                        >
                          {copiedToken === (invitation.token || invitation.id) ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        {isOwnerOrAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancelInvitation(invitation.id)}
                            disabled={cancelInvitation.isPending}
                            title="Cancel invitation"
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No pending invitations</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
