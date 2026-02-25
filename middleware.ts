import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// TODO: Remove dev bypass before production
export default function middleware(req: NextRequest) {
  if (process.env.DEV_BYPASS_AUTH === "true") {
    return NextResponse.next();
  }
  return withAuth({
    pages: { signIn: "/login" },
  })(req as any, {} as any);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/hunt/new",
    "/hunt/:id((?!.*live$)(?!.*overlay$).*)",
    "/presets/:path*",
    "/stats/:path*",
    "/billing/:path*",
    "/settings/:path*",
    "/editor/:path*",
    "/admin/:path*",
  ],
};
