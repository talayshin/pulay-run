/**
 * Clerk auth proxy.
 *
 * Protects all routes except public ones (sign-in, sign-up, API webhooks).
 * Uses proxy.ts (not middleware.ts) per Next.js 16 + Clerk latest convention.
 * See: https://clerk.com/docs/nextjs/getting-started/quickstart
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/strava/webhook(.*)", // Strava webhook must be publicly accessible
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
