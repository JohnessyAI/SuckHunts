import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) return null;
        if (!user.isMod && !user.isAdmin) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Skip upsert for credentials login — user already exists
      if (account?.provider === "credentials") return true;

      // OAuth flow: upsert user
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name ?? "User",
          image: user.image,
        },
        create: {
          email: user.email,
          name: user.name ?? "User",
          image: user.image,
        },
      });

      return true;
    },
    async jwt({ token, trigger }) {
      if (!token.email) return token;

      // Refresh user data on sign-in or update
      if (trigger === "signIn" || trigger === "update" || !token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });

        if (dbUser) {
          token.userId = dbUser.id;
          token.subscriptionTier = dbUser.subscriptionTier;
          token.isAdmin = dbUser.isAdmin;
          token.isMod = dbUser.isMod;
          token.ownerIds = dbUser.ownerIds;
          token.onboardingDone = dbUser.onboardingDone;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.subscriptionTier = token.subscriptionTier as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.isMod = (token.isMod as boolean) ?? false;
        session.user.ownerIds = (token.ownerIds as string[]) ?? [];
        session.user.onboardingDone = token.onboardingDone as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
