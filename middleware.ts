import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

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
