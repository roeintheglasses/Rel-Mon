import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env"
    );
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing svix headers", { status: 400 });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error verifying webhook", { status: 400 });
  }

  const eventType = evt.type;

  try {
    switch (eventType) {
      // User events
      case "user.created":
      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url } =
          evt.data;

        const primaryEmail = email_addresses?.find(
          (e) => e.id === evt.data.primary_email_address_id
        )?.email_address;

        if (!primaryEmail) {
          console.error("No primary email found for user:", id);
          return new Response("No primary email", { status: 400 });
        }

        await prisma.user.upsert({
          where: { clerkUserId: id },
          create: {
            clerkUserId: id,
            email: primaryEmail,
            firstName: first_name || null,
            lastName: last_name || null,
            avatarUrl: image_url || null,
          },
          update: {
            email: primaryEmail,
            firstName: first_name || null,
            lastName: last_name || null,
            avatarUrl: image_url || null,
          },
        });
        break;
      }

      case "user.deleted": {
        const { id } = evt.data;
        if (id) {
          await prisma.user.delete({
            where: { clerkUserId: id },
          }).catch(() => {
            // User might not exist in our DB
          });
        }
        break;
      }

      // Organization events
      case "organization.created":
      case "organization.updated": {
        const { id, name, slug } = evt.data;

        await prisma.team.upsert({
          where: { clerkOrgId: id },
          create: {
            clerkOrgId: id,
            name: name,
            slug: slug,
          },
          update: {
            name: name,
            slug: slug,
          },
        });
        break;
      }

      case "organization.deleted": {
        const { id } = evt.data;
        if (id) {
          await prisma.team.delete({
            where: { clerkOrgId: id },
          }).catch(() => {
            // Team might not exist in our DB
          });
        }
        break;
      }

      // Organization membership events
      case "organizationMembership.created": {
        const { organization, public_user_data, role } = evt.data;

        // Find the team and user
        const team = await prisma.team.findUnique({
          where: { clerkOrgId: organization.id },
        });

        const user = await prisma.user.findUnique({
          where: { clerkUserId: public_user_data.user_id },
        });

        if (team && user) {
          // Map Clerk role to our role
          const teamRole = mapClerkRole(role);

          await prisma.teamMember.upsert({
            where: {
              teamId_userId: {
                teamId: team.id,
                userId: user.id,
              },
            },
            create: {
              teamId: team.id,
              userId: user.id,
              role: teamRole,
            },
            update: {
              role: teamRole,
            },
          });
        }
        break;
      }

      case "organizationMembership.updated": {
        const { organization, public_user_data, role } = evt.data;

        const team = await prisma.team.findUnique({
          where: { clerkOrgId: organization.id },
        });

        const user = await prisma.user.findUnique({
          where: { clerkUserId: public_user_data.user_id },
        });

        if (team && user) {
          const teamRole = mapClerkRole(role);

          await prisma.teamMember.update({
            where: {
              teamId_userId: {
                teamId: team.id,
                userId: user.id,
              },
            },
            data: {
              role: teamRole,
            },
          });
        }
        break;
      }

      case "organizationMembership.deleted": {
        const { organization, public_user_data } = evt.data;

        const team = await prisma.team.findUnique({
          where: { clerkOrgId: organization.id },
        });

        const user = await prisma.user.findUnique({
          where: { clerkUserId: public_user_data.user_id },
        });

        if (team && user) {
          await prisma.teamMember.delete({
            where: {
              teamId_userId: {
                teamId: team.id,
                userId: user.id,
              },
            },
          }).catch(() => {
            // Membership might not exist
          });
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
    }

    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Error processing webhook", { status: 500 });
  }
}

// Helper function to map Clerk roles to our TeamRole enum
function mapClerkRole(clerkRole: string): "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" {
  switch (clerkRole) {
    case "org:admin":
      return "ADMIN";
    case "org:member":
      return "MEMBER";
    default:
      return "MEMBER";
  }
}
