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
  const isSuperadminRoute = pathname.startsWith("/superadmin");
  const isLoginRoute = pathname === "/login";

  const cookiesToSet: CookieToSet[] = [];

  // Read at request time, not inlined at build time: Next 16's Proxy runs on
  // the Node.js runtime, so these are ordinary server-side variables and do not
  // need a NEXT_PUBLIC_ prefix. See src/lib/supabase/client.ts for how the
  // browser gets the same pair.
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
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

  if ((isAdminRoute || isSuperadminRoute) && !isAuthenticated) {
    return applyCookies(NextResponse.redirect(new URL("/login", request.url)), cookiesToSet);
  }

  if (isAuthenticated && (isAdminRoute || isSuperadminRoute || isLoginRoute)) {
    const userId = data?.claims?.sub;
    if (!userId) {
      return applyCookies(NextResponse.redirect(new URL("/login", request.url)), cookiesToSet);
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, is_active")
      .eq("id", userId)
      .maybeSingle();

    if ((isAdminRoute || isSuperadminRoute) && (!profile || !profile.is_active)) {
      return applyCookies(NextResponse.redirect(new URL("/login", request.url)), cookiesToSet);
    }

    if (isSuperadminRoute && profile?.role !== "superadmin") {
      return applyCookies(NextResponse.redirect(new URL("/admin", request.url)), cookiesToSet);
    }

    if (isAdminRoute && profile?.role !== "admin" && profile?.role !== "superadmin") {
      return applyCookies(NextResponse.redirect(new URL("/login", request.url)), cookiesToSet);
    }

    if (isLoginRoute && profile?.is_active && (profile.role === "admin" || profile.role === "superadmin")) {
      return applyCookies(NextResponse.redirect(new URL("/admin", request.url)), cookiesToSet);
    }
  }

  return applyCookies(NextResponse.next({ request }), cookiesToSet);
}
