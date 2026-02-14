import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/auth/signin", "/auth/signup", "/"];

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const pathname = request.nextUrl.pathname;

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // No token - redirect to signin
  if (!token) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  const userRole = token.role as string;

  // Role-based route protection
  if (pathname.startsWith("/candidate") && userRole !== "candidate") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/admin") && userRole !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/supervisor") && !["supervisor", "admin"].includes(userRole)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (
    userRole === "candidate" &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/roadmap") ||
      pathname.startsWith("/tracker") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/supervisor"))
  ) {
    return NextResponse.redirect(new URL("/candidate", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
