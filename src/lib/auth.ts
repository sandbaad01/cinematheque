import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

const secret = process.env.NEXTAUTH_SECRET || "cinematheque-dev-secret-change-in-production-DO-NOT-USE-IN-PROD";

export const authOptions: NextAuthOptions = {
  secret,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const databaseUrl = process.env.DATABASE_URL;
          const authToken = process.env.DATABASE_AUTH_TOKEN;

          if (!databaseUrl) {
            console.error("DATABASE_URL not set");
            return null;
          }

          const client = createClient({
            url: databaseUrl,
            authToken: authToken || undefined,
          });

          // Find user by email
          const result = await client.execute({
            sql: "SELECT id, email, name, passwordHash, image FROM User WHERE email = ?",
            args: [credentials.email.toLowerCase()],
          });

          if (result.rows.length === 0) {
            return null;
          }

          const row = result.rows[0];
          const passwordHash = row.passwordHash as string | null;
          if (!passwordHash) {
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, passwordHash);
          if (!isValid) {
            return null;
          }

          return {
            id: row.id as string,
            email: row.email as string,
            name: (row.name as string) || null,
            image: (row.image as string) || null,
          };
        } catch (err) {
          console.error("Authorize error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
};
