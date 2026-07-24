import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Use a separate Prisma client for auth to avoid circular dependencies
const prisma = new PrismaClient();

// Generate a default secret for development if not set.
// In production, NEXTAUTH_SECRET must be set in environment variables.
const secret = process.env.NEXTAUTH_SECRET || "cinematheque-dev-secret-change-in-production-DO-NOT-USE-IN-PROD";

export const authOptions: NextAuthOptions = {
  secret,
  // PrismaAdapter requires a PrismaClient instance
  adapter: {
    createUser: async (data) => {
      return prisma.user.create({ data: { email: data.email, name: data.name, image: data.image } });
    },
    getUser: async (id) => prisma.user.findUnique({ where: { id } }),
    getUserByEmail: async (email) => prisma.user.findUnique({ where: { email } }),
    getUserByAccount: async ({ providerAccountId, provider }) => {
      // GitHub OAuth: find by email (since we don't have an Account model)
      // For credentials, this isn't used
      return null;
    },
    updateUser: async (data) => prisma.user.update({ where: { id: data.id }, data }),
    deleteUser: async (id) => prisma.user.delete({ where: { id } }),
    linkAccount: async () => {},
    unlinkAccount: async () => {},
    createSession: async () => null,
    getSession: async () => null,
    updateSession: async () => null,
    deleteSession: async () => null,
    createVerificationToken: async () => null,
    useVerificationToken: async () => null,
  } as any,
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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
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
