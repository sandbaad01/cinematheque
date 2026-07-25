import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email: string = (body?.email ?? "").toString().toLowerCase().trim();
    const password: string = (body?.password ?? "").toString();
    const name: string = (body?.name ?? "").toString().trim();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const databaseUrl = process.env.DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN;

    if (!databaseUrl) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const client = createClient({
      url: databaseUrl,
      authToken: authToken || undefined,
    });

    const existing = await client.execute({
      sql: "SELECT id FROM User WHERE email = ?",
      args: [email],
    });
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 8);
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();

    await client.execute({
      sql: "INSERT INTO User (id, email, name, passwordHash, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, email, name || null, passwordHash, now, now],
    });

    return NextResponse.json({
      id,
      email,
      name: name || null,
    }, { status: 201 });
  } catch (err) {
    console.error("POST /api/auth/signup error", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to create account: ${msg}` },
      { status: 500 }
    );
  }
}