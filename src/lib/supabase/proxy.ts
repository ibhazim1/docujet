import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function applyCookies(response: NextResponse, cookiesToSet: CookieToSet[]) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/login";

  const cookiesToSet: CookieToSet[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(nextCookies) {
          cookiesToSet.push(...nextCookies);
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims) && !error;

  if (isAdminRoute && !isAuthenticated) {
    return applyCookies(NextResponse.redirect(new URL("/login", request.url)), cookiesToSet);
  }

  if (isLoginRoute && isAuthenticated) {
    return applyCookies(NextResponse.redirect(new URL("/admin", request.url)), cookiesToSet);
  }

  return applyCookies(NextResponse.next({ request }), cookiesToSet);
}
