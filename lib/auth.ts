import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
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
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // Upsert user in our database
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
        session.user.onboardingDone = token.onboardingDone as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
