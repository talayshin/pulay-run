/**
 * Clerk webhook handler.
 *
 * Listens for Clerk events (user.created, user.updated, user.deleted)
 * and syncs them to our database.
 *
 * Clerk sends a Svix-signed POST to this endpoint. We verify the
 * signature before processing — never trust unverified payloads.
 *
 * Setup: In the Clerk Dashboard → Webhooks, create an endpoint
 * pointing to <your-domain>/api/webhooks/clerk and subscribe to
 * user.created, user.updated, and user.deleted events. Copy the
 * signing secret into CLERK_WEBHOOK_SECRET in .env.local.
 *
 * See: https://clerk.com/docs/webhooks/sync-data
 */

import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

interface ClerkUserEvent {
  data: {
    id: string;
    email_addresses: { email_address: string; id: string }[];
    primary_email_address_id: string;
  };
  type: string;
}

function getPrimaryEmail(data: ClerkUserEvent["data"]): string {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  );
  return primary?.email_address ?? data.email_addresses[0]?.email_address ?? "";
}

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  // Verify the webhook signature using Svix
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing Svix headers" },
      { status: 400 }
    );
  }

  const body = await req.text();
  const wh = new Webhook(webhookSecret);

  let event: ClerkUserEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch {
    console.error("Webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the event
  const { type, data } = event;

  switch (type) {
    case "user.created": {
      const email = getPrimaryEmail(data);
      // onConflictDoNothing handles Svix retries and races with the onboarding
      // server action fallback (see src/app/onboarding/actions.ts).
      await db
        .insert(users)
        .values({ clerkUserId: data.id, email })
        .onConflictDoNothing({ target: users.clerkUserId });
      break;
    }

    case "user.updated": {
      const email = getPrimaryEmail(data);
      await db
        .update(users)
        .set({ email, updatedAt: new Date() })
        .where(eq(users.clerkUserId, data.id));
      break;
    }

    case "user.deleted": {
      await db.delete(users).where(eq(users.clerkUserId, data.id));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
