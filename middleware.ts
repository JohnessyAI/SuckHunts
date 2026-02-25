import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// TODO: Remove dev bypass before production
function devBypass(req: NextRequest) {
  return NextResponse.next();
}

const authMiddleware = withAuth({
  pages: {
    signIn: "/login",
  },
});

export default process.env.NODE_ENV === "development"
  ? devBypass
  : authMiddleware;

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
