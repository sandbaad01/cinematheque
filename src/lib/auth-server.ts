import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Get the authenticated user's session from a server-side context.
 * Returns null if not authenticated.
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Get the authenticated user's ID, or return a 401 response.
 * Use this in API routes to enforce authentication.
 *
 * @returns A tuple of [userId, errorResponse]. If errorResponse is null,
 *          userId is guaranteed to be a non-null string.
 *
 * @example
 * const [userId, error] = await requireUserId();
 * if (error) return error;
 * // userId is now guaranteed to be a string
 */
export async function requireUserId(): Promise<[string, null] | [null, NextResponse]> {
  const session = await getSession();
  if (!session?.user) {
    return [null, NextResponse.json({ error: "Unauthorized" }, { status: 401 })];
  }
  const userId = (session.user as any).id as string | undefined;
  if (!userId) {
    return [null, NextResponse.json({ error: "Invalid session" }, { status: 401 })];
  }
  return [userId, null];
}
